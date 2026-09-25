-- Reactions and discussion on community posts
CREATE TABLE IF NOT EXISTS public.community_likes (
  message_id uuid REFERENCES public.community_messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.community_likes TO authenticated;
GRANT ALL ON public.community_likes TO service_role;
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Learners can read likes"
  ON public.community_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Learners can add their own likes"
  ON public.community_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Learners can remove their own likes"
  ON public.community_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.community_messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  display_name text NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.community_comments TO authenticated;
GRANT ALL ON public.community_comments TO service_role;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Learners can read comments"
  ON public.community_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Learners can add their own comments"
  ON public.community_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.community_saves (
  message_id uuid REFERENCES public.community_messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.community_saves TO authenticated;
GRANT ALL ON public.community_saves TO service_role;
ALTER TABLE public.community_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Learners can read their own saves"
  ON public.community_saves FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Learners can save posts"
  ON public.community_saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Learners can unsave posts"
  ON public.community_saves FOR DELETE TO authenticated USING (auth.uid() = user_id);