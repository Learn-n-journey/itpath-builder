alter table public.profiles
  add column if not exists bio text,
  add column if not exists currently_learning text,
  add column if not exists learning_goal text,
  add column if not exists show_learning_progress boolean not null default true,
  add column if not exists show_learning_goal boolean not null default true,
  add column if not exists show_achievements boolean not null default true;

alter table public.profiles drop constraint if exists profiles_bio_length;
alter table public.profiles add constraint profiles_bio_length check (char_length(coalesce(bio,'')) <= 240);
alter table public.profiles drop constraint if exists profiles_currently_learning_length;
alter table public.profiles add constraint profiles_currently_learning_length check (char_length(coalesce(currently_learning,'')) <= 120);
alter table public.profiles drop constraint if exists profiles_learning_goal_length;
alter table public.profiles add constraint profiles_learning_goal_length check (char_length(coalesce(learning_goal,'')) <= 160);
