begin;

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'مستخدم شغلني',
  account_status text not null default 'active'
    check (account_status in ('active', 'suspended', 'disabled')),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint profiles_display_name_length check (
    pg_catalog.char_length(pg_catalog.btrim(display_name)) between 2 and 80
    and display_name = pg_catalog.btrim(display_name)
  )
);

create table public.roles (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  role_key text not null unique
    check (role_key ~ '^[a-z][a-z0-9_]{1,63}$'),
  description text not null,
  created_at timestamptz not null default pg_catalog.now()
);

create table public.permissions (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  permission_key text not null unique
    check (permission_key ~ '^[a-z][a-z0-9_.]{1,95}$'),
  description text not null,
  created_at timestamptz not null default pg_catalog.now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete restrict,
  permission_id uuid not null references public.permissions (id) on delete restrict,
  created_at timestamptz not null default pg_catalog.now(),
  primary key (role_id, permission_id)
);

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete restrict,
  assigned_by uuid references auth.users (id) on delete set null,
  assigned_at timestamptz not null default pg_catalog.now(),
  primary key (user_id, role_id)
);

create table public.admin_audit_events (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  target_user_id uuid references auth.users (id) on delete set null,
  event_type text not null
    check (event_type ~ '^[a-z][a-z0-9_.]{1,95}$'),
  details jsonb not null default '{}'::jsonb
    check (pg_catalog.jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default pg_catalog.now()
);

create index profiles_account_status_created_idx
  on public.profiles (account_status, created_at desc);
create index user_roles_role_user_idx
  on public.user_roles (role_id, user_id);
create index role_permissions_permission_idx
  on public.role_permissions (permission_id, role_id);
create index admin_audit_events_actor_created_idx
  on public.admin_audit_events (actor_user_id, created_at desc);
create index admin_audit_events_target_created_idx
  on public.admin_audit_events (target_user_id, created_at desc);
create unique index admin_audit_events_single_bootstrap_idx
  on public.admin_audit_events (event_type)
  where event_type = 'bootstrap.super_admin';

insert into public.roles (role_key, description) values
  ('user', 'Standard verified user; no administrative permissions.'),
  ('task_reviewer', 'Reviews task evidence; has no financial permissions.'),
  ('task_manager', 'Creates and manages task definitions.'),
  ('finance_reviewer', 'Reviews financial and subscription payment requests.'),
  ('security_admin_owner', 'Security owner with full administrative permissions.')
on conflict (role_key) do nothing;

insert into public.permissions (permission_key, description) values
  ('task.review.read', 'View task evidence submissions.'),
  ('task.review.approve', 'Approve a task submission.'),
  ('task.review.reject', 'Reject a task submission.'),
  ('task.manage.read', 'View task definitions.'),
  ('task.manage.write', 'Create and edit task definitions.'),
  ('task.manage.publish', 'Publish and deactivate task definitions.'),
  ('subscription.payment.read', 'View subscription payment requests.'),
  ('subscription.payment.approve', 'Approve subscription payments.'),
  ('subscription.payment.reject', 'Reject subscription payments.'),
  ('deposit.review.read', 'View deposit requests.'),
  ('deposit.review.approve', 'Approve deposits.'),
  ('deposit.review.reject', 'Reject deposits.'),
  ('withdrawal.review.read', 'View withdrawal requests.'),
  ('withdrawal.review.approve', 'Approve withdrawals.'),
  ('withdrawal.review.reject', 'Reject withdrawals.'),
  ('financial.settings.read', 'View financial settings.'),
  ('financial.settings.write', 'Change financial settings.'),
  ('user.read', 'View user management records.'),
  ('user.status.manage', 'Activate, suspend, or disable accounts.'),
  ('user.roles.manage', 'Assign or revoke administrative roles.'),
  ('audit.read', 'Read administrative audit events.')
on conflict (permission_key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.role_key = 'security_admin_owner'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'task.review.read', 'task.review.approve', 'task.review.reject'
)
where r.role_key = 'task_reviewer'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'task.manage.read', 'task.manage.write', 'task.manage.publish'
)
where r.role_key = 'task_manager'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_key in (
  'subscription.payment.read', 'subscription.payment.approve', 'subscription.payment.reject',
  'deposit.review.read', 'deposit.review.approve', 'deposit.review.reject',
  'withdrawal.review.read', 'withdrawal.review.approve', 'withdrawal.review.reject',
  'financial.settings.read'
)
where r.role_key = 'finance_reviewer'
on conflict do nothing;

create function public.current_user_is_verified_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users as u
    join public.profiles as p on p.user_id = u.id
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
      and p.account_status = 'active'
  );
$$;

create function public.get_my_account_status()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.account_status
  from auth.users as u
  join public.profiles as p on p.user_id = u.id
  where u.id = (select auth.uid())
    and u.email_confirmed_at is not null;
$$;

create function public.has_permission(permission_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_user_is_verified_active()
    and exists (
      select 1
      from public.user_roles as ur
      join public.role_permissions as rp on rp.role_id = ur.role_id
      join public.permissions as p on p.id = rp.permission_id
      where ur.user_id = (select auth.uid())
        and p.permission_key = permission_name
    );
$$;

create function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text;
  v_user_role_id uuid;
begin
  v_display_name := pg_catalog.left(
    pg_catalog.btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')),
    80
  );
  if pg_catalog.char_length(v_display_name) < 2 then
    v_display_name := 'مستخدم شغلني';
  end if;

  insert into public.profiles (user_id, display_name)
  values (new.id, v_display_name)
  on conflict (user_id) do nothing;

  select id into v_user_role_id
  from public.roles
  where role_key = 'user';

  if v_user_role_id is null then
    raise exception 'Default user role is not provisioned';
  end if;

  insert into public.user_roles (user_id, role_id)
  values (new.id, v_user_role_id)
  on conflict (user_id, role_id) do nothing;

  return new;
end;
$$;

insert into public.profiles (user_id, display_name)
select
  u.id,
  case
    when pg_catalog.char_length(pg_catalog.btrim(coalesce(u.raw_user_meta_data ->> 'display_name', ''))) < 2
      then 'مستخدم شغلني'
    else pg_catalog.left(pg_catalog.btrim(u.raw_user_meta_data ->> 'display_name'), 80)
  end
from auth.users u
on conflict (user_id) do nothing;

insert into public.user_roles (user_id, role_id)
select u.id, r.id
from auth.users u
join public.roles r on r.role_key = 'user'
on conflict (user_id, role_id) do nothing;

create function public.assign_user_role(
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

create function public.revoke_user_role(
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

create function public.change_user_status(
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
  if target_user_id = (select auth.uid())
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

create function public.bootstrap_first_super_admin(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role_id uuid;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'Bootstrap denied';
  end if;
  if exists (
    select 1 from public.admin_audit_events
    where event_type = 'bootstrap.super_admin'
  ) then
    raise exception using errcode = '23505', message = 'Bootstrap already completed';
  end if;
  if not exists (
    select 1
    from auth.users u
    join public.profiles p on p.user_id = u.id
    where u.id = target_user_id
      and u.email_confirmed_at is not null
      and p.account_status = 'active'
  ) then
    raise exception using errcode = 'P0002', message = 'Verified active account required';
  end if;

  select id into v_role_id
  from public.roles
  where role_key = 'security_admin_owner';
  if v_role_id is null then
    raise exception 'Security owner role is not provisioned';
  end if;

  insert into public.user_roles (user_id, role_id)
  values (target_user_id, v_role_id)
  on conflict (user_id, role_id) do nothing;

  insert into public.admin_audit_events (
    actor_user_id, target_user_id, event_type, details
  ) values (
    null, target_user_id, 'bootstrap.super_admin',
    pg_catalog.jsonb_build_object('method', 'trusted_local_operator')
  );
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_profile_updated_at();

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.admin_audit_events enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.roles from anon, authenticated;
revoke all on table public.permissions from anon, authenticated;
revoke all on table public.role_permissions from anon, authenticated;
revoke all on table public.user_roles from anon, authenticated;
revoke all on table public.admin_audit_events from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;
grant select on table public.roles to authenticated;
grant select on table public.permissions to authenticated;
grant select on table public.role_permissions to authenticated;
grant select on table public.user_roles to authenticated;
grant select on table public.admin_audit_events to authenticated;

create policy profiles_select_own_active_verified
  on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) and (select public.current_user_is_verified_active()));
create policy profiles_update_own_active_verified
  on public.profiles for update to authenticated
  using (user_id = (select auth.uid()) and (select public.current_user_is_verified_active()))
  with check (user_id = (select auth.uid()) and (select public.current_user_is_verified_active()));

create policy roles_read_by_role_managers
  on public.roles for select to authenticated
  using ((select public.has_permission('user.roles.manage')));
create policy permissions_read_by_role_managers
  on public.permissions for select to authenticated
  using ((select public.has_permission('user.roles.manage')));
create policy role_permissions_read_by_role_managers
  on public.role_permissions for select to authenticated
  using ((select public.has_permission('user.roles.manage')));
create policy user_roles_read_self_or_managers
  on public.user_roles for select to authenticated
  using (
    (user_id = (select auth.uid()) and (select public.current_user_is_verified_active()))
    or (select public.has_permission('user.roles.manage'))
  );
create policy admin_audit_events_read_authorized
  on public.admin_audit_events for select to authenticated
  using ((select public.has_permission('audit.read')));

revoke all on function public.current_user_is_verified_active() from public, anon;
revoke all on function public.get_my_account_status() from public, anon;
revoke all on function public.has_permission(text) from public, anon;
revoke all on function public.assign_user_role(uuid, text) from public, anon;
revoke all on function public.revoke_user_role(uuid, text) from public, anon;
revoke all on function public.change_user_status(uuid, text) from public, anon;
revoke all on function public.bootstrap_first_super_admin(uuid) from public, anon, authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.set_profile_updated_at() from public, anon, authenticated;

grant execute on function public.current_user_is_verified_active() to authenticated;
grant execute on function public.get_my_account_status() to authenticated;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.assign_user_role(uuid, text) to authenticated;
grant execute on function public.revoke_user_role(uuid, text) to authenticated;
grant execute on function public.change_user_status(uuid, text) to authenticated;
grant execute on function public.bootstrap_first_super_admin(uuid) to service_role;

commit;
