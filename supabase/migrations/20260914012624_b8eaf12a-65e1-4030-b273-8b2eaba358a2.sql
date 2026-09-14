CREATE TABLE public.ai_cache (
  cache_key TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  value JSONB NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.ai_cache TO service_role;
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ai_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  kind TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day, kind)
);
GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own AI usage" ON public.ai_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.bump_ai_usage(_user_id UUID, _kind TEXT, _limit INTEGER)
RETURNS TABLE (allowed BOOLEAN, used INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO public.ai_usage (user_id, day, kind, count, updated_at)
  VALUES (_user_id, (now() AT TIME ZONE 'utc')::date, _kind, 1, now())
  ON CONFLICT (user_id, day, kind)
  DO UPDATE SET count = public.ai_usage.count + 1, updated_at = now()
  RETURNING public.ai_usage.count INTO new_count;

  RETURN QUERY SELECT new_count <= _limit, new_count;
END;
$$;
REVOKE ALL ON FUNCTION public.bump_ai_usage(UUID, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_ai_usage(UUID, TEXT, INTEGER) TO service_role;