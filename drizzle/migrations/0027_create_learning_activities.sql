-- Learning Activity foundation.
-- Records discrete, shareable learner milestones. It does not replace user_state
-- (private progress snapshot), community_messages (hand-written posts), or
-- profiles (identity + global visibility switches).

CREATE TABLE IF NOT EXISTS public.learning_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  title text NOT NULL,
  description text,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility text NOT NULL DEFAULT 'private',
  is_featured boolean NOT NULL DEFAULT false,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_activities_type_check CHECK (activity_type IN (
    'lesson_completed',
    'mastery_advanced',
    'lab_completed',
    'achievement_earned',
    'project_completed',
    'certification_milestone',
    'streak_milestone',
    'game_accomplishment'
  )),
  CONSTRAINT learning_activities_visibility_check CHECK (visibility IN (
    'private',
    'friends',
    'community',
    'public'
  )),
  CONSTRAINT learning_activities_title_len CHECK (char_length(title) BETWEEN 1 AND 160),
  CONSTRAINT learning_activities_description_len CHECK (description IS NULL OR char_length(description) <= 600),
  CONSTRAINT learning_activities_entity_len CHECK (entity_id IS NULL OR char_length(entity_id) <= 200)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_activities TO authenticated;
GRANT ALL ON public.learning_activities TO service_role;

ALTER TABLE public.learning_activities ENABLE ROW LEVEL SECURITY;

-- Owners always read their own activity, whatever its visibility.
CREATE POLICY "Learners read their own activity"
  ON public.learning_activities FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Signed-in learners read activity shared with the community or the profile.
CREATE POLICY "Learners read shared activity"
  ON public.learning_activities FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND visibility IN ('community', 'public'));

-- Friends-only activity requires an accepted friendship in both directions.
CREATE POLICY "Friends read friends-only activity"
  ON public.learning_activities FOR SELECT TO authenticated
  USING (
    visibility = 'friends'
    AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.requester_id = auth.uid() AND f.addressee_id = learning_activities.user_id)
          OR (f.addressee_id = auth.uid() AND f.requester_id = learning_activities.user_id)
        )
    )
  );

-- Activity can only ever be created for yourself.
CREATE POLICY "Learners create their own activity"
  ON public.learning_activities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Both USING and WITH CHECK bind to the caller, so ownership cannot be reassigned.
CREATE POLICY "Learners update their own activity"
  ON public.learning_activities FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Learners delete their own activity"
  ON public.learning_activities FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS learning_activities_user_occurred_idx
  ON public.learning_activities (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS learning_activities_visibility_occurred_idx
  ON public.learning_activities (visibility, occurred_at DESC);

CREATE INDEX IF NOT EXISTS learning_activities_featured_idx
  ON public.learning_activities (user_id, occurred_at DESC)
  WHERE is_featured;

CREATE INDEX IF NOT EXISTS learning_activities_type_idx
  ON public.learning_activities (user_id, activity_type, occurred_at DESC);

CREATE TRIGGER learning_activities_set_updated_at
  BEFORE UPDATE ON public.learning_activities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();