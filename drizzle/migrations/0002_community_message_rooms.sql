ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS room text NOT NULL DEFAULT 'general';

CREATE INDEX IF NOT EXISTS community_messages_room_created_at_idx
  ON public.community_messages (room, created_at DESC);