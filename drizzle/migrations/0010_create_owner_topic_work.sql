CREATE TABLE public.owner_topic_work (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  topic_id text NOT NULL,
  source_file text NOT NULL DEFAULT '',
  work jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'approved',
  notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.owner_topic_work TO authenticated;
GRANT ALL ON public.owner_topic_work TO service_role;

ALTER TABLE public.owner_topic_work ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners read approved owner topic work"
ON public.owner_topic_work FOR SELECT TO authenticated
USING (status = 'approved');

CREATE INDEX owner_topic_work_topic_idx ON public.owner_topic_work (domain, topic_id);