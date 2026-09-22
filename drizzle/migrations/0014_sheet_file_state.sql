CREATE TABLE IF NOT EXISTS public.sheet_file_state (
  file_id text PRIMARY KEY,
  domain text NOT NULL,
  folder text NOT NULL,
  file_name text NOT NULL,
  last_modified text NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.sheet_file_state TO service_role;

ALTER TABLE public.sheet_file_state ENABLE ROW LEVEL SECURITY;