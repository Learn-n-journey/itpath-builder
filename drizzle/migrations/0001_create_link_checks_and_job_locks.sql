CREATE TABLE public.link_checks (
  url text PRIMARY KEY,
  kind text NOT NULL,
  label text,
  status integer,
  ok boolean NOT NULL DEFAULT true,
  fail_count integer NOT NULL DEFAULT 0,
  last_error text,
  checked_at timestamptz
);

GRANT SELECT ON public.link_checks TO authenticated;
GRANT ALL ON public.link_checks TO service_role;

ALTER TABLE public.link_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed in learners can read link health"
  ON public.link_checks FOR SELECT TO authenticated
  USING (true);

CREATE INDEX link_checks_checked_idx ON public.link_checks (checked_at NULLS FIRST);

CREATE TABLE public.job_locks (
  job text PRIMARY KEY,
  locked_until timestamptz NOT NULL,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.job_locks TO service_role;

ALTER TABLE public.job_locks ENABLE ROW LEVEL SECURITY;