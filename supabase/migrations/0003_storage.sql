-- Private storage buckets. Every object path starts with the business id:
--   <business_id>/<...>
-- Clients can read their own business's files; experts can read and write everything.

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('client-uploads', 'client-uploads', false, 10485760),   -- 10 MB (photos are compressed first)
  ('voice-notes',    'voice-notes',    false, 10485760),
  ('deliverables',   'deliverables',   false, 52428800),   -- 50 MB (video cap)
  ('brand-assets',   'brand-assets',   false, 10485760),
  ('examples',       'examples',       false, 52428800)
on conflict (id) do nothing;

-- Read
create policy sg_read_own on storage.objects for select to authenticated
  using (
    bucket_id in ('client-uploads', 'voice-notes', 'deliverables', 'brand-assets')
    and public.owns_business_folder((storage.foldername(name))[1])
  );
create policy sg_read_expert on storage.objects for select to authenticated
  using (
    bucket_id in ('client-uploads', 'voice-notes', 'deliverables', 'brand-assets', 'examples')
    and public.is_expert()
  );

-- Clients upload photos and voice notes into their own folder
create policy sg_client_upload on storage.objects for insert to authenticated
  with check (
    bucket_id in ('client-uploads', 'voice-notes')
    and public.owns_business_folder((storage.foldername(name))[1])
  );

-- Experts write anywhere
create policy sg_expert_insert on storage.objects for insert to authenticated
  with check (
    bucket_id in ('client-uploads', 'voice-notes', 'deliverables', 'brand-assets', 'examples')
    and public.is_expert()
  );
create policy sg_expert_update on storage.objects for update to authenticated
  using (public.is_expert() and bucket_id in ('deliverables', 'brand-assets', 'examples'));
create policy sg_expert_delete on storage.objects for delete to authenticated
  using (public.is_expert() and bucket_id in ('deliverables', 'brand-assets', 'examples'));
