CREATE TABLE public.sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'all',
  status text NOT NULL DEFAULT 'queued',
  requested_by uuid,
  result jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

CREATE INDEX sync_queue_status_created_idx ON public.sync_queue (status, created_at);

GRANT ALL ON public.sync_queue TO service_role;

ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
