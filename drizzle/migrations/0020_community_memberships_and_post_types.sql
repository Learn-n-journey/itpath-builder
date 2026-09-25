-- Community identity layer: memberships and typed posts.
-- Membership affects discovery only; it does not award mastery or unlock curriculum.

CREATE TABLE IF NOT EXISTS public.community_memberships (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  room text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, room)
);

GRANT SELECT, INSERT, DELETE ON public.community_memberships TO authenticated;
GRANT ALL ON public.community_memberships TO service_role;
ALTER TABLE public.community_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners can read community memberships"
  ON public.community_memberships FOR SELECT TO authenticated USING (true);
CREATE POLICY "Learners can join communities"
  ON public.community_memberships FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Learners can leave communities"
  ON public.community_memberships FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'discussion';

ALTER TABLE public.community_messages
  DROP CONSTRAINT IF EXISTS community_messages_post_type_check;

ALTER TABLE public.community_messages
  ADD CONSTRAINT community_messages_post_type_check
  CHECK (post_type IN ('question','troubleshooting','discussion','progress','project','study-help'));

CREATE INDEX IF NOT EXISTS community_memberships_room_idx
  ON public.community_memberships(room);

CREATE INDEX IF NOT EXISTS community_messages_room_post_type_created_at_idx
  ON public.community_messages(room, post_type, created_at DESC);
