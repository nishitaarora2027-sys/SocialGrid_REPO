-- Pay-per-post: each verified ₹ per-post payment adds one credit; asking for a post without
-- an active plan uses one up. Safe to run more than once.
alter table public.subscriptions
  add column if not exists post_credits int not null default 0 check (post_credits >= 0);
