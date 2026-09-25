-- Social community overhaul: likes, threaded comments, and saved posts.
-- Existing community_messages remain the post source so current rooms and moderation keep working.

CREATE TABLE IF NOT EXISTS public.community_likes (
  message_id uuid NOT NULL REFERENCES public.community_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.community_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_comments_message_created_idx
  ON public.community_comments(message_id, created_at ASC);

CREATE TABLE IF NOT EXISTS public.community_saves (
  message_id uuid NOT NULL REFERENCES public.community_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community likes readable" ON public.community_likes;
CREATE POLICY "community likes readable" ON public.community_likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "community likes own insert" ON public.community_likes;
CREATE POLICY "community likes own insert" ON public.community_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "community likes own delete" ON public.community_likes;
CREATE POLICY "community likes own delete" ON public.community_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "community comments readable" ON public.community_comments;
CREATE POLICY "community comments readable" ON public.community_comments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "community comments own insert" ON public.community_comments;
CREATE POLICY "community comments own insert" ON public.community_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "community comments own delete" ON public.community_comments;
CREATE POLICY "community comments own delete" ON public.community_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "community saves own read" ON public.community_saves;
CREATE POLICY "community saves own read" ON public.community_saves FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "community saves own insert" ON public.community_saves;
CREATE POLICY "community saves own insert" ON public.community_saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "community saves own delete" ON public.community_saves;
CREATE POLICY "community saves own delete" ON public.community_saves FOR DELETE TO authenticated USING (auth.uid() = user_id);
