-- Restores the tables, policies and storage bucket from the original
-- supabase/migrations that a database built only from drizzle/migrations
-- is missing (for example knowledge_items, used by Second Brain).
--
-- Safe to run on any database: every statement only creates what is not
-- already there, and never changes existing tables, rows or policies.

-- Shared trigger functions (same definitions as the originals).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

-- Learner progress saved per account.
CREATE TABLE IF NOT EXISTS public.user_state (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_state TO authenticated;
GRANT ALL ON public.user_state TO service_role;
ALTER TABLE public.user_state ENABLE ROW LEVEL SECURITY;

-- Paid plans (read by the paywall; nothing writes to it while payments are off).
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  paddle_subscription_id text not null unique,
  paddle_customer_id text not null,
  product_id text not null,
  price_id text not null,
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  environment text not null default 'sandbox',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle_id ON public.subscriptions(paddle_subscription_id);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Beta and creator access.
CREATE TABLE IF NOT EXISTS public.beta_access (
  email text PRIMARY KEY,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.beta_access TO authenticated;
GRANT ALL ON public.beta_access TO service_role;
ALTER TABLE public.beta_access ENABLE ROW LEVEL SECURITY;
INSERT INTO public.beta_access (email, note) VALUES ('boleydavid7@outlook.com', 'Creator')
ON CONFLICT (email) DO NOTHING;

-- AI tutor conversations.
CREATE TABLE IF NOT EXISTS public.tutor_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Tutor conversation',
  mode text,
  topic_id text,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS idx_tutor_threads_user_updated ON public.tutor_threads(user_id, updated_at desc);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutor_threads TO authenticated;
GRANT ALL ON public.tutor_threads TO service_role;
ALTER TABLE public.tutor_threads ENABLE ROW LEVEL SECURITY;

-- Second Brain.
CREATE TABLE IF NOT EXISTS public.knowledge_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'note',
  title TEXT NOT NULL,
  source_url TEXT,
  notes TEXT,
  content TEXT,
  file_path TEXT,
  file_type TEXT,
  summary TEXT,
  concepts JSONB NOT NULL DEFAULT '[]'::jsonb,
  key_terms JSONB NOT NULL DEFAULT '[]'::jsonb,
  topic_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  cert_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
  contradictions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS knowledge_items_user_created_idx ON public.knowledge_items (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_items TO authenticated;
GRANT ALL ON public.knowledge_items TO service_role;
ALTER TABLE public.knowledge_items ENABLE ROW LEVEL SECURITY;

-- Private bucket for files saved to Second Brain (path starts with the user id).
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge', 'knowledge', false)
ON CONFLICT (id) DO NOTHING;

-- First name and profile details.
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name)
  VALUES (
    NEW.id,
    NULLIF(
      TRIM(COALESCE(
        NEW.raw_user_meta_data ->> 'first_name',
        NEW.raw_user_meta_data ->> 'given_name',
        SPLIT_PART(COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''), ' ', 1)
      )),
      ''
    )
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Shared AI answer cache, daily AI allowance and AI cost telemetry.
CREATE TABLE IF NOT EXISTS public.ai_cache (
  cache_key TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  value JSONB NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_cache
  ADD COLUMN IF NOT EXISTS bucket text,
  ADD COLUMN IF NOT EXISTS norm text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS ai_cache_bucket_idx ON public.ai_cache (bucket, last_used_at DESC);
GRANT ALL ON public.ai_cache TO service_role;
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ai_usage (
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
REVOKE ALL ON FUNCTION public.bump_ai_usage(UUID, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_ai_usage(UUID, TEXT, INTEGER) TO service_role;

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

-- Row-level security policies, each added only when missing.
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN SELECT * FROM (VALUES
    ('public', 'user_state', 'Users can manage their own state',
     'CREATE POLICY "Users can manage their own state" ON public.user_state FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)'),
    ('public', 'subscriptions', 'Users can view own subscription',
     'CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id)'),
    ('public', 'subscriptions', 'Service role can manage subscriptions',
     'CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions FOR ALL TO service_role USING (auth.role() = ''service_role'')'),
    ('public', 'beta_access', 'Users can see their own beta access row',
     'CREATE POLICY "Users can see their own beta access row" ON public.beta_access FOR SELECT TO authenticated USING (lower(email) = lower(coalesce(auth.jwt() ->> ''email'', '''')))'),
    ('public', 'tutor_threads', 'Users can manage their own tutor threads',
     'CREATE POLICY "Users can manage their own tutor threads" ON public.tutor_threads FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)'),
    ('public', 'knowledge_items', 'Users manage their own knowledge items',
     'CREATE POLICY "Users manage their own knowledge items" ON public.knowledge_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)'),
    ('public', 'profiles', 'Users manage their own profile',
     'CREATE POLICY "Users manage their own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)'),
    ('public', 'ai_usage', 'Users can read their own AI usage',
     'CREATE POLICY "Users can read their own AI usage" ON public.ai_usage FOR SELECT TO authenticated USING (auth.uid() = user_id)'),
    ('public', 'ai_cache', 'No direct access to the AI cache',
     'CREATE POLICY "No direct access to the AI cache" ON public.ai_cache FOR ALL TO authenticated USING (false) WITH CHECK (false)'),
    ('public', 'ai_events', 'No direct client access to ai events',
     'CREATE POLICY "No direct client access to ai events" ON public.ai_events FOR SELECT TO authenticated USING (false)'),
    ('storage', 'objects', 'Users read own knowledge files',
     'CREATE POLICY "Users read own knowledge files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = ''knowledge'' AND auth.uid()::text = (storage.foldername(name))[1])'),
    ('storage', 'objects', 'Users upload own knowledge files',
     'CREATE POLICY "Users upload own knowledge files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = ''knowledge'' AND auth.uid()::text = (storage.foldername(name))[1])'),
    ('storage', 'objects', 'Users update own knowledge files',
     'CREATE POLICY "Users update own knowledge files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = ''knowledge'' AND auth.uid()::text = (storage.foldername(name))[1])'),
    ('storage', 'objects', 'Users delete own knowledge files',
     'CREATE POLICY "Users delete own knowledge files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = ''knowledge'' AND auth.uid()::text = (storage.foldername(name))[1])')
  ) AS t(schema_name, table_name, policy_name, ddl)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = p.schema_name AND tablename = p.table_name AND policyname = p.policy_name
    ) THEN
      EXECUTE p.ddl;
    END IF;
  END LOOP;
END;
$$;

-- updated_at triggers and the new-account profile trigger, each added only when missing.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT * FROM (VALUES
    ('public.user_state'::regclass, 'user_state_set_updated_at',
     'CREATE TRIGGER user_state_set_updated_at BEFORE UPDATE ON public.user_state FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()'),
    ('public.tutor_threads'::regclass, 'tutor_threads_set_updated_at',
     'CREATE TRIGGER tutor_threads_set_updated_at BEFORE UPDATE ON public.tutor_threads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()'),
    ('public.knowledge_items'::regclass, 'update_knowledge_items_updated_at',
     'CREATE TRIGGER update_knowledge_items_updated_at BEFORE UPDATE ON public.knowledge_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()'),
    ('public.profiles'::regclass, 'profiles_set_updated_at',
     'CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()'),
    ('auth.users'::regclass, 'on_auth_user_created',
     'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()')
  ) AS v(table_oid, trigger_name, ddl)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgrelid = t.table_oid AND tgname = t.trigger_name AND NOT tgisinternal
    ) THEN
      EXECUTE t.ddl;
    END IF;
  END LOOP;
END;
$$;

-- Ask PostgREST to reload its schema cache so the API sees new tables at once.
NOTIFY pgrst, 'reload schema';
