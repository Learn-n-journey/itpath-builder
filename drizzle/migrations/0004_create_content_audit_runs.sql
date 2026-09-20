create table public.content_audit_runs (
  id uuid primary key default gen_random_uuid(),
  pack text not null,
  duration_ms integer,
  blocking integer not null default 0,
  warnings integer not null default 0,
  findings jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Backend-only: the nightly audit job writes here, and nothing in the app
-- reads it, so no role gets access and no policy is defined.
GRANT ALL ON public.content_audit_runs TO service_role;

alter table public.content_audit_runs enable row level security;