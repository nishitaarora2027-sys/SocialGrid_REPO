-- Row Level Security.
-- Clients: read their own business's data. Their writes (new requests, chat messages,
-- choosing an option, asking for changes) go through server actions that verify
-- ownership and then write with the service role, so clients get almost no direct
-- write policies. Experts: full access.

alter table public.roles              enable row level security;
alter table public.profiles           enable row level security;
alter table public.businesses         enable row level security;
alter table public.brand_profiles     enable row level security;
alter table public.offerings          enable row level security;
alter table public.brand_photos       enable row level security;
alter table public.weekly_plans       enable row level security;
alter table public.plan_slots         enable row level security;
alter table public.conversations      enable row level security;
alter table public.requests           enable row level security;
alter table public.messages           enable row level security;
alter table public.conversation_reads enable row level security;
alter table public.revisions          enable row level security;
alter table public.content_options    enable row level security;
alter table public.downloads          enable row level security;
alter table public.rules              enable row level security;
alter table public.examples           enable row level security;
alter table public.festivals          enable row level security;
alter table public.suggestions        enable row level security;
alter table public.plans              enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.settings           enable row level security;
alter table public.quick_start_cards  enable row level security;

-- Reference data: readable by any signed-in user, writable by experts
create policy roles_read on public.roles for select to authenticated using (true);

create policy festivals_read on public.festivals for select to authenticated using (true);
create policy festivals_write on public.festivals for all to authenticated
  using (public.is_expert()) with check (public.is_expert());

create policy plans_read on public.plans for select to authenticated using (true);
create policy plans_write on public.plans for all to authenticated
  using (public.is_expert()) with check (public.is_expert());

create policy settings_read on public.settings for select to authenticated using (true);
create policy settings_write on public.settings for update to authenticated
  using (public.is_expert()) with check (public.is_expert());

create policy qs_read on public.quick_start_cards for select to authenticated using (true);
create policy qs_write on public.quick_start_cards for all to authenticated
  using (public.is_expert()) with check (public.is_expert());

-- Profiles: users see themselves; experts see everyone.
-- Only these columns can be changed through the API; the role cannot.
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_expert());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_expert())
  with check (id = auth.uid() or public.is_expert());
revoke update on public.profiles from authenticated;
grant update (display_name, preferred_ui_language) on public.profiles to authenticated;

-- Business-scoped tables: owner reads, expert does everything
create policy businesses_read on public.businesses for select to authenticated
  using (public.can_see_business(id));
create policy businesses_write on public.businesses for all to authenticated
  using (public.is_expert()) with check (public.is_expert());

create policy brand_read on public.brand_profiles for select to authenticated
  using (public.can_see_business(business_id));
create policy brand_write on public.brand_profiles for all to authenticated
  using (public.is_expert()) with check (public.is_expert());

create policy offerings_read on public.offerings for select to authenticated
  using (public.can_see_business(business_id));
create policy offerings_write on public.offerings for all to authenticated
  using (public.is_expert()) with check (public.is_expert());

create policy brand_photos_read on public.brand_photos for select to authenticated
  using (public.can_see_business(business_id));
create policy brand_photos_insert on public.brand_photos for insert to authenticated
  with check (public.can_see_business(business_id));
create policy brand_photos_delete on public.brand_photos for delete to authenticated
  using (public.is_expert());

create policy weekly_plans_read on public.weekly_plans for select to authenticated
  using (public.can_see_business(business_id));
create policy weekly_plans_write on public.weekly_plans for all to authenticated
  using (public.is_expert()) with check (public.is_expert());

create policy plan_slots_read on public.plan_slots for select to authenticated
  using (public.can_see_business(business_id));
create policy plan_slots_write on public.plan_slots for all to authenticated
  using (public.is_expert()) with check (public.is_expert());

create policy conversations_read on public.conversations for select to authenticated
  using (public.can_see_business(business_id));
create policy conversations_write on public.conversations for all to authenticated
  using (public.is_expert()) with check (public.is_expert());

create policy requests_read on public.requests for select to authenticated
  using (public.can_see_business(business_id));
create policy requests_write on public.requests for all to authenticated
  using (public.is_expert()) with check (public.is_expert());

create policy messages_read on public.messages for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and public.can_see_business(c.business_id)
  ));
create policy messages_write on public.messages for all to authenticated
  using (public.is_expert()) with check (public.is_expert());

create policy reads_own on public.conversation_reads for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy reads_expert on public.conversation_reads for select to authenticated
  using (public.is_expert());

create policy revisions_read on public.revisions for select to authenticated
  using (exists (
    select 1 from public.requests r where r.id = request_id and public.can_see_business(r.business_id)
  ));
create policy revisions_write on public.revisions for all to authenticated
  using (public.is_expert()) with check (public.is_expert());

-- Clients only ever see options that have been delivered, never drafts
create policy options_read_client on public.content_options for select to authenticated
  using (
    delivered_at is not null and exists (
      select 1 from public.requests r where r.id = request_id and public.owns_business(r.business_id)
    )
  );
create policy options_expert on public.content_options for all to authenticated
  using (public.is_expert()) with check (public.is_expert());

create policy downloads_read on public.downloads for select to authenticated
  using (profile_id = auth.uid() or public.is_expert());

create policy rules_expert on public.rules for all to authenticated
  using (public.is_expert()) with check (public.is_expert());

create policy examples_expert on public.examples for all to authenticated
  using (public.is_expert()) with check (public.is_expert());

create policy suggestions_read on public.suggestions for select to authenticated
  using (public.can_see_business(business_id));
create policy suggestions_write on public.suggestions for all to authenticated
  using (public.is_expert()) with check (public.is_expert());

create policy subscriptions_read on public.subscriptions for select to authenticated
  using (public.can_see_business(business_id));
create policy subscriptions_write on public.subscriptions for all to authenticated
  using (public.is_expert()) with check (public.is_expert());

grant execute on function public.request_access(uuid, public.content_type) to authenticated;
grant execute on function public.client_update_timings(uuid, text) to authenticated;
grant execute on function public.client_update_offering_price(uuid, numeric) to authenticated;

-- Realtime: chat and queue update live
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.requests;
