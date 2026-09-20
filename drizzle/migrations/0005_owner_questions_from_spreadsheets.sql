create table public.owner_questions (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  topic_id text not null,
  source_file text not null default '',
  row_number integer not null default 0,
  question jsonb not null,
  status text not null default 'approved',
  reject_reasons jsonb not null default '[]'::jsonb,
  synced_at timestamptz not null default now(),
  unique (topic_id, source_file, row_number)
);

grant select on public.owner_questions to authenticated;
grant all on public.owner_questions to service_role;

alter table public.owner_questions enable row level security;

create policy "Learners read approved owner questions"
  on public.owner_questions
  for select to authenticated
  using (status = 'approved');

create policy "Owner reads all owner question rows"
  on public.owner_questions
  for select to authenticated
  using (
    lower(coalesce(auth.jwt() ->> 'email', '')) = any (
      array['boleydavid7@outlook.com', 'boleydavid7@gmail.com']
    )
  );
