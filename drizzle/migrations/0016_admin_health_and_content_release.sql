-- Owner admin control room: health runs, content release lifecycle,
-- activity log and aggregate flow counters. All additive.

CREATE TABLE public.health_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'all',
  state TEXT NOT NULL DEFAULT 'unknown',
  checks JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.health_runs TO authenticated;
GRANT ALL ON public.health_runs TO service_role;
ALTER TABLE public.health_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads health runs" ON public.health_runs
  FOR SELECT TO authenticated
  USING (lower(COALESCE((auth.jwt() ->> 'email'), '')) = ANY (ARRAY['boleydavid7@outlook.com','boleydavid7@gmail.com']));
CREATE INDEX health_runs_area_finished_idx ON public.health_runs (area, finished_at DESC);

CREATE TABLE public.content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'imported',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_file TEXT NOT NULL DEFAULT '',
  note TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  validated_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  superseded_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  approved_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.content_versions TO authenticated;
GRANT ALL ON public.content_versions TO service_role;
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads content versions" ON public.content_versions
  FOR SELECT TO authenticated
  USING (lower(COALESCE((auth.jwt() ->> 'email'), '')) = ANY (ARRAY['boleydavid7@outlook.com','boleydavid7@gmail.com']));
CREATE INDEX content_versions_topic_idx ON public.content_versions (domain, topic_id, kind, imported_at DESC);
CREATE INDEX content_versions_status_idx ON public.content_versions (status);

CREATE TRIGGER content_versions_set_updated_at
  BEFORE UPDATE ON public.content_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.admin_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area TEXT NOT NULL,
  action TEXT NOT NULL,
  subject TEXT,
  result TEXT NOT NULL DEFAULT 'info',
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_activity TO authenticated;
GRANT ALL ON public.admin_activity TO service_role;
ALTER TABLE public.admin_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads admin activity" ON public.admin_activity
  FOR SELECT TO authenticated
  USING (lower(COALESCE((auth.jwt() ->> 'email'), '')) = ANY (ARRAY['boleydavid7@outlook.com','boleydavid7@gmail.com']));
CREATE INDEX admin_activity_created_idx ON public.admin_activity (created_at DESC);

CREATE TABLE public.flow_events (
  day DATE NOT NULL,
  flow TEXT NOT NULL,
  outcome TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  slow_count INTEGER NOT NULL DEFAULT 0,
  total_ms BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (day, flow, outcome)
);
GRANT SELECT ON public.flow_events TO authenticated;
GRANT ALL ON public.flow_events TO service_role;
ALTER TABLE public.flow_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads flow events" ON public.flow_events
  FOR SELECT TO authenticated
  USING (lower(COALESCE((auth.jwt() ->> 'email'), '')) = ANY (ARRAY['boleydavid7@outlook.com','boleydavid7@gmail.com']));

-- Aggregate, identity-free counter used by the flow health tab.
CREATE OR REPLACE FUNCTION public.bump_flow_event(_flow TEXT, _outcome TEXT, _duration_ms INTEGER DEFAULT 0, _slow BOOLEAN DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.flow_events (day, flow, outcome, count, slow_count, total_ms, updated_at)
  VALUES ((now() AT TIME ZONE 'utc')::date, _flow, _outcome, 1, CASE WHEN _slow THEN 1 ELSE 0 END, GREATEST(_duration_ms, 0), now())
  ON CONFLICT (day, flow, outcome) DO UPDATE
    SET count = public.flow_events.count + 1,
        slow_count = public.flow_events.slow_count + CASE WHEN _slow THEN 1 ELSE 0 END,
        total_ms = public.flow_events.total_ms + GREATEST(_duration_ms, 0),
        updated_at = now();
END;
$$;

-- Let live owner content be matched to a recorded version without timestamps.
ALTER TABLE public.owner_lessons ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE public.owner_lessons ADD COLUMN IF NOT EXISTS version_id UUID;
ALTER TABLE public.owner_questions ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE public.owner_questions ADD COLUMN IF NOT EXISTS version_id UUID;
ALTER TABLE public.owner_topic_work ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE public.owner_topic_work ADD COLUMN IF NOT EXISTS version_id UUID;