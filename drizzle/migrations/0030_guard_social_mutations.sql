-- Guard social mutations at the database boundary.
-- RLS decides which rows are visible; these triggers restrict which columns and
-- state transitions may be changed by an authenticated client.

CREATE OR REPLACE FUNCTION public.guard_direct_message_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.friendship_id IS DISTINCT FROM OLD.friendship_id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only read_at may be changed on a direct message.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS direct_messages_guard_update ON public.direct_messages;
CREATE TRIGGER direct_messages_guard_update
  BEFORE UPDATE ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_direct_message_update();

CREATE OR REPLACE FUNCTION public.guard_friendship_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.requester_id IS DISTINCT FROM OLD.requester_id
     OR NEW.addressee_id IS DISTINCT FROM OLD.addressee_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Friendship membership and creation data are immutable.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF auth.uid() IS DISTINCT FROM OLD.addressee_id
       OR OLD.status <> 'pending'
       OR NEW.status NOT IN ('accepted', 'declined', 'blocked') THEN
      RAISE EXCEPTION 'Only the recipient may resolve a pending friendship request.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS friendships_guard_update ON public.friendships;
CREATE TRIGGER friendships_guard_update
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.guard_friendship_update();
