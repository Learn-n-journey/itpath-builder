-- Optional image on community posts
ALTER TABLE public.community_messages ADD COLUMN IF NOT EXISTS image_url text;

-- Friendships between learners
CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  addressee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);
GRANT SELECT, INSERT, UPDATE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their friendships"
  ON public.friendships FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Learners can request friends"
  ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Members can update their friendships"
  ON public.friendships FOR UPDATE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Private messages inside an accepted friendship
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  friendship_id uuid REFERENCES public.friendships(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Friends can read their messages"
  ON public.direct_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.id = friendship_id
      AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
  ));
CREATE POLICY "Friends can send messages"
  ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.id = friendship_id AND f.status = 'accepted'
        AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
    )
  );
CREATE POLICY "Recipients can mark messages read"
  ON public.direct_messages FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.id = friendship_id
      AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
  ));

-- Live updates for chat and messaging
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;