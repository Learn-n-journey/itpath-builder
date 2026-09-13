create table public.tutor_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Tutor conversation',
  mode text,
  topic_id text,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tutor_threads_user_updated on public.tutor_threads(user_id, updated_at desc);

grant select, insert, update, delete on public.tutor_threads to authenticated;
grant all on public.tutor_threads to service_role;

alter table public.tutor_threads enable row level security;

create policy "Users can manage their own tutor threads"
  on public.tutor_threads for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger tutor_threads_set_updated_at
  before update on public.tutor_threads
  for each row execute function public.set_updated_at();