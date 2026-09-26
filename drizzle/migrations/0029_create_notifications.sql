-- Secure notification system: recipient-owned, database-generated only.
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN ('post_comment','post_like','friend_accepted')),
  community_message_id uuid REFERENCES public.community_messages(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE,
  friendship_id uuid REFERENCES public.friendships(id) ON DELETE CASCADE,
  preview_text text CHECK (preview_text IS NULL OR char_length(preview_text) <= 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CHECK (user_id <> actor_id)
);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipients read their notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Recipients mark their notifications read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Recipients delete their notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT policy for authenticated: clients can never create notifications.

-- Fast newest-first loading and unread counting.
CREATE INDEX notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx
  ON public.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

-- Duplicate protection per underlying event.
CREATE UNIQUE INDEX notifications_unique_comment
  ON public.notifications (user_id, comment_id)
  WHERE comment_id IS NOT NULL;
CREATE UNIQUE INDEX notifications_unique_like
  ON public.notifications (user_id, actor_id, community_message_id)
  WHERE notification_type = 'post_like';
CREATE UNIQUE INDEX notifications_unique_friend_accepted
  ON public.notifications (user_id, friendship_id)
  WHERE notification_type = 'friend_accepted';

-- Recipients may only flip read_at; everything else stays immutable.
CREATE OR REPLACE FUNCTION public.notifications_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.actor_id IS DISTINCT FROM OLD.actor_id
     OR NEW.notification_type IS DISTINCT FROM OLD.notification_type
     OR NEW.community_message_id IS DISTINCT FROM OLD.community_message_id
     OR NEW.comment_id IS DISTINCT FROM OLD.comment_id
     OR NEW.friendship_id IS DISTINCT FROM OLD.friendship_id
     OR NEW.preview_text IS DISTINCT FROM OLD.preview_text
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only the read state of a notification can be changed.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notifications_guard_update_trigger
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.notifications_guard_update();

-- Comment on someone else's post.
CREATE OR REPLACE FUNCTION public.notify_on_community_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT m.user_id INTO owner_id FROM public.community_messages m WHERE m.id = NEW.message_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (user_id, actor_id, notification_type, community_message_id, comment_id, preview_text)
  VALUES (owner_id, NEW.user_id, 'post_comment', NEW.message_id, NEW.id, left(btrim(NEW.body), 160))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER community_comments_notify
  AFTER INSERT ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_community_comment();

-- Like on someone else's post.
CREATE OR REPLACE FUNCTION public.notify_on_community_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  owner_id uuid;
  body_preview text;
BEGIN
  SELECT m.user_id, left(btrim(m.body), 160) INTO owner_id, body_preview
    FROM public.community_messages m WHERE m.id = NEW.message_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (user_id, actor_id, notification_type, community_message_id, preview_text)
  VALUES (owner_id, NEW.user_id, 'post_like', NEW.message_id, body_preview)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER community_likes_notify
  AFTER INSERT ON public.community_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_community_like();

-- Friend request accepted: notify the original requester.
CREATE OR REPLACE FUNCTION public.notify_on_friendship_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted'
     AND NEW.requester_id <> NEW.addressee_id THEN
    INSERT INTO public.notifications (user_id, actor_id, notification_type, friendship_id, preview_text)
    VALUES (NEW.requester_id, NEW.addressee_id, 'friend_accepted', NEW.id, 'Accepted your friend request')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER friendships_notify_accepted
  AFTER UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_friendship_accepted();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
