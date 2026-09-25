-- Community post images.
ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS image_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('community-images', 'community-images', true, 8388608, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 8388608;

DROP POLICY IF EXISTS "community images public read" ON storage.objects;
CREATE POLICY "community images public read" ON storage.objects
FOR SELECT USING (bucket_id = 'community-images');

DROP POLICY IF EXISTS "community images authenticated upload" ON storage.objects;
CREATE POLICY "community images authenticated upload" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'community-images' AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "community images owner delete" ON storage.objects;
CREATE POLICY "community images owner delete" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'community-images' AND (storage.foldername(name))[1] = auth.uid()::text
);
