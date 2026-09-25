ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
CREATE POLICY "Profile images readable" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'profile-images');
CREATE POLICY "Users upload own profile image" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'profile-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own profile image" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'profile-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own profile image" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'profile-images' AND (storage.foldername(name))[1] = auth.uid()::text);