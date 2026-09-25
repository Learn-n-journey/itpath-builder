alter table public.profiles drop constraint if exists profiles_bio_length;
alter table public.profiles add constraint profiles_bio_length check (char_length(coalesce(bio,'')) <= 240);
alter table public.profiles drop constraint if exists profiles_currently_learning_length;
alter table public.profiles add constraint profiles_currently_learning_length check (char_length(coalesce(currently_learning,'')) <= 120);
alter table public.profiles drop constraint if exists profiles_learning_goal_length;
alter table public.profiles add constraint profiles_learning_goal_length check (char_length(coalesce(learning_goal,'')) <= 160);