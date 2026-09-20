CREATE TABLE public.course_maintenance (
  domain text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.course_maintenance TO anon;
GRANT SELECT ON public.course_maintenance TO authenticated;
GRANT ALL ON public.course_maintenance TO service_role;

ALTER TABLE public.course_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read maintenance state"
ON public.course_maintenance
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role manages maintenance state"
ON public.course_maintenance
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

INSERT INTO public.course_maintenance (domain, enabled) VALUES
  ('it-cybersecurity', false),
  ('auto-repair', false);
