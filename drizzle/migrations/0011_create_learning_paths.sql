CREATE TABLE public.learning_paths (
  slug text PRIMARY KEY,
  name text NOT NULL,
  folder text NOT NULL,
  topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  visible boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.learning_paths TO authenticated;
GRANT ALL ON public.learning_paths TO service_role;

ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners read visible learning paths"
ON public.learning_paths
FOR SELECT
TO authenticated
USING (visible = true);

CREATE POLICY "Owner reads every learning path"
ON public.learning_paths
FOR SELECT
TO authenticated
USING (
  lower(coalesce((auth.jwt() ->> 'email'), '')) = ANY (ARRAY['boleydavid7@outlook.com','boleydavid7@gmail.com'])
);

CREATE TRIGGER learning_paths_set_updated_at
BEFORE UPDATE ON public.learning_paths
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();