begin;

select plan(24);

select pg_catalog.set_config('test.active_user_id', pg_catalog.gen_random_uuid()::text, true);
select pg_catalog.set_config('test.unverified_user_id', pg_catalog.gen_random_uuid()::text, true);
select pg_catalog.set_config('test.suspended_user_id', pg_catalog.gen_random_uuid()::text, true);
select pg_catalog.set_config('test.target_user_id', pg_catalog.gen_random_uuid()::text, true);
select pg_catalog.set_config('test.owner_user_id', pg_catalog.gen_random_uuid()::text, true);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    current_setting('test.active_user_id')::uuid, 'authenticated', 'authenticated',
    'phase2-active@example.invalid', '', pg_catalog.now(), '{}'::jsonb,
    '{"display_name":"Active User"}'::jsonb, pg_catalog.now(), pg_catalog.now()
  ),
  (
    current_setting('test.unverified_user_id')::uuid, 'authenticated', 'authenticated',
    'phase2-unverified@example.invalid', '', null, '{}'::jsonb,
    '{"display_name":"Unverified User"}'::jsonb, pg_catalog.now(), pg_catalog.now()
  ),
  (
    current_setting('test.suspended_user_id')::uuid, 'authenticated', 'authenticated',
    'phase2-suspended@example.invalid', '', pg_catalog.now(), '{}'::jsonb,
    '{"display_name":"Suspended User"}'::jsonb, pg_catalog.now(), pg_catalog.now()
  ),
  (
    current_setting('test.target_user_id')::uuid, 'authenticated', 'authenticated',
    'phase2-target@example.invalid', '', pg_catalog.now(), '{}'::jsonb,
    '{"display_name":"Target User"}'::jsonb, pg_catalog.now(), pg_catalog.now()
  ),
  (
    current_setting('test.owner_user_id')::uuid, 'authenticated', 'authenticated',
    'phase2-owner@example.invalid', '', pg_catalog.now(), '{}'::jsonb,
    '{"display_name":"Admin Owner"}'::jsonb, pg_catalog.now(), pg_catalog.now()
  );

insert into public.user_roles (user_id, role_id)
select current_setting('test.active_user_id')::uuid, r.id
from public.roles r
where r.role_key = 'task_reviewer';

update public.profiles
set account_status = 'suspended'
where user_id = current_setting('test.suspended_user_id')::uuid;

insert into public.user_roles (user_id, role_id)
select current_setting('test.owner_user_id')::uuid, r.id
from public.roles r
where r.role_key = 'security_admin_owner';

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', current_setting('test.active_user_id'), true);
select pg_catalog.set_config('request.jwt.claim.role', 'authenticated', true);
select pg_catalog.set_config(
  'request.jwt.claims',
  pg_catalog.json_build_object(
    'sub', current_setting('test.active_user_id'),
    'role', 'authenticated',
    'email', 'phase2-active@example.invalid',
    'email_confirmed_at', pg_catalog.now()
  )::text,
  true
);

select is(
  (select pg_catalog.count(*)::integer from public.profiles
   where user_id = current_setting('test.active_user_id')::uuid),
  1,
  'Auth user creation creates exactly one profile'
);
select is(
  (select pg_catalog.count(*)::integer from public.user_roles ur
   join public.roles r on r.id = ur.role_id
   where ur.user_id = current_setting('test.active_user_id')::uuid and r.role_key = 'user'),
  1,
  'Auth user creation assigns the standard user role exactly once'
);
select is(public.has_permission('task.review.read'), true, 'Task reviewer has task review read permission');
select is(public.has_permission('deposit.review.approve'), false, 'Task reviewer has no deposit approval permission');
select is(
  (select pg_catalog.count(*)::integer from public.profiles),
  1,
  'User can read only their own profile'
);
select is(
  (select pg_catalog.count(*)::integer from public.profiles
   where user_id = current_setting('test.unverified_user_id')::uuid),
  0,
  'User cannot read an unverified account profile'
);
select is(
  (select pg_catalog.count(*)::integer from public.profiles
   where user_id = current_setting('test.suspended_user_id')::uuid),
  0,
  'User cannot read a suspended account profile'
);
select is(
  (select pg_catalog.count(*)::integer from public.profiles
   where user_id = current_setting('test.target_user_id')::uuid),
  0,
  'User cannot read another active account profile'
);
select is(
  (with updated as (
    update public.profiles set display_name = 'Unauthorized Change'
    where user_id = current_setting('test.target_user_id')::uuid
    returning 1
  ) select pg_catalog.count(*)::integer from updated),
  0,
  'User cannot modify another account profile'
);
select lives_ok(
  pg_catalog.format(
    'update public.profiles set display_name = %L where user_id = %L::uuid',
    'Updated Name', current_setting('test.active_user_id')
  ),
  'User can update their own allowlisted profile field'
);
select throws_ok(
  pg_catalog.format(
    'update public.profiles set account_status = %L where user_id = %L::uuid',
    'suspended', current_setting('test.active_user_id')
  ),
  '42501', null,
  'User cannot update their account status'
);
select throws_ok(
  pg_catalog.format(
    'insert into public.user_roles(user_id, role_id) values (%L::uuid, (select id from public.roles where role_key = %L))',
    current_setting('test.active_user_id'), 'security_admin_owner'
  ),
  '42501', null,
  'User cannot assign roles directly'
);
select throws_ok(
  pg_catalog.format(
    'insert into public.role_permissions(role_id, permission_id) values ((select id from public.roles where role_key = %L), (select id from public.permissions where permission_key = %L))',
    'user', 'user.roles.manage'
  ),
  '42501', null,
  'User cannot modify role permissions directly'
);
select throws_ok(
  pg_catalog.format(
    'insert into public.admin_audit_events(event_type) values (%L)',
    'user.role.assigned'
  ),
  '42501', null,
  'User cannot write administrative audit records directly'
);
select throws_ok(
  pg_catalog.format(
    'select public.assign_user_role(%L::uuid, %L)',
    current_setting('test.active_user_id'), 'security_admin_owner'
  ),
  '42501', null,
  'User cannot grant themselves an administrative role'
);
select throws_ok(
  pg_catalog.format(
    'select public.bootstrap_first_super_admin(%L::uuid)',
    current_setting('test.active_user_id')
  ),
  '42501', null,
  'Authenticated users cannot call the bootstrap function'
);

select pg_catalog.set_config('request.jwt.claim.sub', current_setting('test.owner_user_id'), true);
select pg_catalog.set_config(
  'request.jwt.claims',
  pg_catalog.json_build_object(
    'sub', current_setting('test.owner_user_id'),
    'role', 'authenticated',
    'email', 'phase2-owner@example.invalid',
    'email_confirmed_at', pg_catalog.now()
  )::text,
  true
);
select lives_ok(
  pg_catalog.format(
    'select public.assign_user_role(%L::uuid, %L)',
    current_setting('test.target_user_id'), 'task_reviewer'
  ),
  'Authorized security owner can assign a role'
);
select lives_ok(
  pg_catalog.format(
    'select public.change_user_status(%L::uuid, %L)',
    current_setting('test.target_user_id'), 'suspended'
  ),
  'Authorized security owner can change another account status'
);
select is(
  (select pg_catalog.count(*)::integer from public.admin_audit_events
   where actor_user_id = current_setting('test.owner_user_id')::uuid
     and target_user_id = current_setting('test.target_user_id')::uuid),
  2,
  'Authorized role and status changes produce audit events'
);

select pg_catalog.set_config('request.jwt.claim.sub', current_setting('test.unverified_user_id'), true);
select pg_catalog.set_config(
  'request.jwt.claims',
  pg_catalog.json_build_object(
    'sub', current_setting('test.unverified_user_id'),
    'role', 'authenticated',
    'email', 'phase2-unverified@example.invalid'
  )::text,
  true
);
select is(public.has_permission('task.review.read'), false, 'Unverified user has no administrative permissions');

select pg_catalog.set_config('request.jwt.claim.sub', current_setting('test.suspended_user_id'), true);
select pg_catalog.set_config(
  'request.jwt.claims',
  pg_catalog.json_build_object(
    'sub', current_setting('test.suspended_user_id'),
    'role', 'authenticated',
    'email', 'phase2-suspended@example.invalid',
    'email_confirmed_at', pg_catalog.now()
  )::text,
  true
);
select is(public.has_permission('task.review.read'), false, 'Suspended user has no administrative permissions');

select ok(
  pg_catalog.strpos(
    pg_catalog.pg_get_functiondef('public.assign_user_role(uuid,text)'::pg_catalog.regprocedure),
    'pg_advisory_xact_lock'
  ) > 0,
  'Role assignment serializes with owner role and status changes'
);
select ok(
  pg_catalog.strpos(
    pg_catalog.pg_get_functiondef('public.revoke_user_role(uuid,text)'::pg_catalog.regprocedure),
    'pg_advisory_xact_lock'
  ) > 0,
  'Role revocation serializes concurrent owner changes'
);
select ok(
  pg_catalog.strpos(
    pg_catalog.pg_get_functiondef('public.change_user_status(uuid,text)'::pg_catalog.regprocedure),
    'pg_advisory_xact_lock'
  ) > 0,
  'Account status changes serialize concurrent owner changes'
);

select * from finish();
rollback;
