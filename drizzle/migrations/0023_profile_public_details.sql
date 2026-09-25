ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS currently_learning text,
  ADD COLUMN IF NOT EXISTS learning_goal text,
  ADD COLUMN IF NOT EXISTS show_learning_progress boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_learning_goal boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_achievements boolean NOT NULL DEFAULT true;