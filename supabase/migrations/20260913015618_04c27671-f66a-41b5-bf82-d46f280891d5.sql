CREATE TABLE public.beta_access (
  email text PRIMARY KEY,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.beta_access TO authenticated;
GRANT ALL ON public.beta_access TO service_role;

ALTER TABLE public.beta_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own beta access row"
ON public.beta_access
FOR SELECT
TO authenticated
USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

INSERT INTO public.beta_access (email, note) VALUES ('boleydavid7@outlook.com', 'Creator');