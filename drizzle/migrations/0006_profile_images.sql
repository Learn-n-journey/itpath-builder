alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-images','profile-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "profile images public read" on storage.objects;
create policy "profile images public read" on storage.objects for select using (bucket_id='profile-images');
drop policy if exists "profile images owner upload" on storage.objects;
create policy "profile images owner upload" on storage.objects for insert to authenticated with check (bucket_id='profile-images' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "profile images owner update" on storage.objects;
create policy "profile images owner update" on storage.objects for update to authenticated using (bucket_id='profile-images' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "profile images owner delete" on storage.objects;
create policy "profile images owner delete" on storage.objects for delete to authenticated using (bucket_id='profile-images' and (storage.foldername(name))[1]=auth.uid()::text);
