ALTER TABLE public.learning_activities
  ADD COLUMN IF NOT EXISTS event_key text;

ALTER TABLE public.learning_activities
  ADD CONSTRAINT learning_activities_event_key_length
  CHECK (event_key IS NULL OR (char_length(event_key) BETWEEN 1 AND 200));

CREATE UNIQUE INDEX IF NOT EXISTS learning_activities_user_event_key_uniq
  ON public.learning_activities (user_id, event_key)
  WHERE event_key IS NOT NULL;

COMMENT ON COLUMN public.learning_activities.event_key IS 'Deterministic per-user identifier for an automatically generated accomplishment; NULL for manual activity. Unique per user when set.';