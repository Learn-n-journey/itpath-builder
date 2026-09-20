CREATE TABLE public.owner_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  topic_id text NOT NULL,
  source_file text NOT NULL DEFAULT '',
  lesson jsonb NOT NULL,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'approved',
  reject_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX owner_lessons_topic_idx ON public.owner_lessons (topic_id, status);

GRANT SELECT ON public.owner_lessons TO authenticated;
GRANT ALL ON public.owner_lessons TO service_role;

ALTER TABLE public.owner_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners read approved owner lessons"
ON public.owner_lessons FOR SELECT TO authenticated
USING (status = 'approved');

CREATE POLICY "Owner reads all owner lesson rows"
ON public.owner_lessons FOR SELECT TO authenticated
USING (lower(COALESCE((auth.jwt() ->> 'email'), '')) = ANY (ARRAY['boleydavid7@outlook.com','boleydavid7@gmail.com']));