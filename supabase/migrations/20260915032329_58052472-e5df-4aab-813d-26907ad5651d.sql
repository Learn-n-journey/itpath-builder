-- Semantic cache support on the existing shared AI answer cache
ALTER TABLE public.ai_cache
  ADD COLUMN IF NOT EXISTS bucket text,
  ADD COLUMN IF NOT EXISTS norm text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS ai_cache_bucket_idx ON public.ai_cache (bucket, last_used_at DESC);

-- Per-call cost and usage telemetry
CREATE TABLE IF NOT EXISTS public.ai_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  feature text NOT NULL,
  model text,
  outcome text NOT NULL,
  risk text,
  priority text,
  escalated boolean NOT NULL DEFAULT false,
  self_checked boolean NOT NULL DEFAULT false,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  est_cost numeric NOT NULL DEFAULT 0,
  saved_cost numeric NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS ai_events_created_idx ON public.ai_events (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_events_feature_idx ON public.ai_events (feature, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_events_user_idx ON public.ai_events (user_id, created_at DESC);

GRANT ALL ON public.ai_events TO service_role;
ALTER TABLE public.ai_events ENABLE ROW LEVEL SECURITY;
-- No policies: only server-side code (service role) reads or writes this table.