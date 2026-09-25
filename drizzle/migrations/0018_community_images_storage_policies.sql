-- Learners can view community images and upload into their own folder
CREATE POLICY "Learners can view community images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'community-images');
CREATE POLICY "Learners can upload community images to their own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'community-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Learners can delete their own community images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'community-images' AND (storage.foldername(name))[1] = auth.uid()::text);