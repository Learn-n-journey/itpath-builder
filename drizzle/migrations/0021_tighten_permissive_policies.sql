DROP POLICY IF EXISTS "Learners can read comments" ON public.community_comments;
CREATE POLICY "Learners can read comments on visible posts" ON public.community_comments
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.community_messages m WHERE m.id = community_comments.message_id AND (m.hidden = false OR m.user_id = auth.uid()))
);

DROP POLICY IF EXISTS "Learners can read likes" ON public.community_likes;
CREATE POLICY "Learners can read likes on visible posts" ON public.community_likes
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.community_messages m WHERE m.id = community_likes.message_id AND (m.hidden = false OR m.user_id = auth.uid()))
);

DROP POLICY IF EXISTS "Anyone can read maintenance state" ON public.course_maintenance;
CREATE POLICY "Anyone can read maintenance state for known courses" ON public.course_maintenance
FOR SELECT TO anon, authenticated USING (domain IN ('it-cybersecurity', 'auto-repair'));

DROP POLICY IF EXISTS "Learners can view community images" ON storage.objects;
CREATE POLICY "Learners can view own or posted community images" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'community-images' AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR EXISTS (SELECT 1 FROM public.community_messages m WHERE m.image_url = storage.objects.name AND m.hidden = false)
  )
);

DROP POLICY IF EXISTS "Profile images readable" ON storage.objects;
CREATE POLICY "Own or current profile images readable" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'profile-images' AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.avatar_url = storage.objects.name)
  )
);