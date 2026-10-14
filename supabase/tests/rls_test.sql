-- Run after stub_supabase.sql + migrations + seed. Raises an exception on failure.
begin;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000e'), ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
insert into profiles (id, role_id, display_name, phone) values
  ('00000000-0000-0000-0000-00000000000e', 1, 'Expert', null),
  ('00000000-0000-0000-0000-00000000000a', 2, 'Sunita', '919000000001'),
  ('00000000-0000-0000-0000-00000000000b', 2, 'Ravi', '919000000002');
insert into businesses (id, owner_profile_id, name, industry) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Glow Salon', 'salon'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Ravi Dhaba', 'restaurant');
insert into requests (id, business_id, due_at) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', now()),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', now());
insert into content_options (request_id, delivered_at) values
  ('20000000-0000-0000-0000-00000000000a', now()), ('20000000-0000-0000-0000-00000000000a', null);
insert into subscriptions (business_id, status, plan_id) values
  ('10000000-0000-0000-0000-00000000000a', 'active', (select id from plans where name = 'Pilot')),
  ('10000000-0000-0000-0000-00000000000b', 'expired', null);
insert into storage.objects (bucket_id, name) values
  ('deliverables', '10000000-0000-0000-0000-00000000000a/r/x.jpg'),
  ('deliverables', '10000000-0000-0000-0000-00000000000b/r/y.jpg');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from businesses) = 1, 'client sees only own business';
  assert (select count(*) from requests) = 1, 'client sees only own requests';
  assert (select count(*) from content_options) = 1, 'client never sees draft options';
  assert (select count(*) from storage.objects) = 1, 'client sees only own files';
  assert (select count(*) from examples) = 0, 'client cannot read examples';
  assert public.request_access('10000000-0000-0000-0000-00000000000a') = 'ok', 'active may request';
  assert public.request_access('10000000-0000-0000-0000-00000000000b') = 'inactive', 'expired may not request';
end $$;
-- client cannot insert requests directly
do $$ begin
  begin
    insert into requests (business_id, due_at) values ('10000000-0000-0000-0000-00000000000a', now());
    raise exception 'client insert should have failed';
  exception when insufficient_privilege then null;
  end;
  begin
    update profiles set role_id = 1 where id = auth.uid();
    raise exception 'role escalation should have failed';
  exception when insufficient_privilege then null;
  end;
end $$;

set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
do $$ begin
  assert (select count(*) from businesses) = 2, 'expert sees all businesses';
  assert (select count(*) from content_options) = 2, 'expert sees drafts';
  assert (select count(*) from storage.objects) = 2, 'expert sees all files';
end $$;
rollback;
select 'RLS tests passed' as result;
