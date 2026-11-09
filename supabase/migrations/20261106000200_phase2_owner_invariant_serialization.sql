begin;

-- Serialize role and account-status mutations so concurrent owner actions
-- cannot each observe the other active owner and remove both in parallel.
-- This transaction-scoped lock is intentionally shared by all three paths.
create or replace function public.assign_user_role(
  target_user_id uuid,
  target_role_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role_id uuid;
  v_rows integer;
begin
  if (select auth.uid()) is null
    or not public.current_user_is_verified_active()
    or not public.has_permission('user.roles.manage') then
    raise exception using errcode = '42501', message = 'Role assignment denied';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(1936746571, 2);

  -- Recheck authorization after any wait for the serialization lock.
  if (select auth.uid()) is null
    or not public.current_user_is_verified_active()
    or not public.has_permission('user.roles.manage') then
    raise exception using errcode = '42501', message = 'Role assignment denied';
  end if;
  if target_user_id = (select auth.uid()) or target_role_key = 'user' then
    raise exception using errcode = '42501', message = 'Role assignment denied';
  end if;
  if not exists (
    select 1 from public.profiles
    where user_id = target_user_id and account_status = 'active'
  ) then
    raise exception using errcode = 'P0002', message = 'Target account unavailable';
  end if;

  select id into v_role_id from public.roles where role_key = target_role_key;
  if v_role_id is null then
    raise exception using errcode = '22023', message = 'Unknown role';
  end if;

  insert into public.user_roles (user_id, role_id, assigned_by)
  values (target_user_id, v_role_id, (select auth.uid()))
  on conflict (user_id, role_id) do nothing;
  get diagnostics v_rows = row_count;

  if v_rows = 1 then
    insert into public.admin_audit_events (
      actor_user_id, target_user_id, event_type, details
    ) values (
      (select auth.uid()), target_user_id, 'user.role.assigned',
      pg_catalog.jsonb_build_object('role_key', target_role_key)
    );
  end if;
end;
$$;

create or replace function public.revoke_user_role(
  target_user_id uuid,
  target_role_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role_id uuid;
  v_rows integer;
  v_remaining integer;
begin
  if (select auth.uid()) is null
    or not public.current_user_is_verified_active()
    or not public.has_permission('user.roles.manage') then
    raise exception using errcode = '42501', message = 'Role revocation denied';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(1936746571, 2);

  -- Recheck authorization after any wait for the serialization lock.
  if (select auth.uid()) is null
    or not public.current_user_is_verified_active()
    or not public.has_permission('user.roles.manage') then
    raise exception using errcode = '42501', message = 'Role revocation denied';
  end if;
  if target_user_id = (select auth.uid()) or target_role_key = 'user' then
    raise exception using errcode = '42501', message = 'Role revocation denied';
  end if;

  select id into v_role_id from public.roles where role_key = target_role_key;
  if v_role_id is null then
    raise exception using errcode = '22023', message = 'Unknown role';
  end if;

  if target_role_key = 'security_admin_owner' then
    select pg_catalog.count(*)::integer into v_remaining
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.profiles p on p.user_id = ur.user_id
    where r.role_key = 'security_admin_owner'
      and p.account_status = 'active'
      and ur.user_id <> target_user_id;
    if v_remaining = 0 then
      raise exception using errcode = '23514', message = 'Cannot remove the final security owner';
    end if;
  end if;

  delete from public.user_roles
  where user_id = target_user_id and role_id = v_role_id;
  get diagnostics v_rows = row_count;
  if v_rows = 1 then
    insert into public.admin_audit_events (
      actor_user_id, target_user_id, event_type, details
    ) values (
      (select auth.uid()), target_user_id, 'user.role.revoked',
      pg_catalog.jsonb_build_object('role_key', target_role_key)
    );
  end if;
end;
$$;

create or replace function public.change_user_status(
  target_user_id uuid,
  new_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer;
  v_remaining integer;
begin
  if (select auth.uid()) is null
    or not public.current_user_is_verified_active()
    or not public.has_permission('user.status.manage') then
    raise exception using errcode = '42501', message = 'Account status change denied';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(1936746571, 2);

  -- Recheck authorization after any wait for the serialization lock.
  if (select auth.uid()) is null
    or not public.current_user_is_verified_active()
    or not public.has_permission('user.status.manage') then
    raise exception using errcode = '42501', message = 'Account status change denied';
  end if;
  if target_user_id = (select auth.uid())
    or new_status is null
    or new_status not in ('active', 'suspended', 'disabled') then
    raise exception using errcode = '42501', message = 'Account status change denied';
  end if;
  if not exists (select 1 from public.profiles where user_id = target_user_id) then
    raise exception using errcode = 'P0002', message = 'Target account unavailable';
  end if;

  if new_status <> 'active' and exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = target_user_id and r.role_key = 'security_admin_owner'
  ) then
    select pg_catalog.count(*)::integer into v_remaining
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.profiles p on p.user_id = ur.user_id
    where r.role_key = 'security_admin_owner'
      and p.account_status = 'active'
      and ur.user_id <> target_user_id;
    if v_remaining = 0 then
      raise exception using errcode = '23514', message = 'Cannot disable the final security owner';
    end if;
  end if;

  update public.profiles
  set account_status = new_status
  where user_id = target_user_id
    and account_status is distinct from new_status;
  get diagnostics v_rows = row_count;
  if v_rows = 1 then
    insert into public.admin_audit_events (
      actor_user_id, target_user_id, event_type, details
    ) values (
      (select auth.uid()), target_user_id, 'user.status.changed',
      pg_catalog.jsonb_build_object('status', new_status)
    );
  end if;
end;
$$;

commit;
