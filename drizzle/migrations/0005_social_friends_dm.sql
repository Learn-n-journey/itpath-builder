-- Friends and private one-to-one messaging.
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);
create unique index if not exists friendships_pair_unique on public.friendships (least(requester_id,addressee_id), greatest(requester_id,addressee_id));

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  friendship_id uuid not null references public.friendships(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists direct_messages_friendship_created on public.direct_messages(friendship_id,created_at);

alter table public.friendships enable row level security;
alter table public.direct_messages enable row level security;

create policy "friendship members read" on public.friendships for select to authenticated using (auth.uid()=requester_id or auth.uid()=addressee_id);
create policy "users request friends" on public.friendships for insert to authenticated with check (auth.uid()=requester_id and requester_id<>addressee_id);
create policy "friendship members update" on public.friendships for update to authenticated using (auth.uid()=requester_id or auth.uid()=addressee_id) with check (auth.uid()=requester_id or auth.uid()=addressee_id);
create policy "friendship members delete" on public.friendships for delete to authenticated using (auth.uid()=requester_id or auth.uid()=addressee_id);

create policy "friends read direct messages" on public.direct_messages for select to authenticated using (
  exists(select 1 from public.friendships f where f.id=friendship_id and f.status='accepted' and (auth.uid()=f.requester_id or auth.uid()=f.addressee_id))
);
create policy "friends send direct messages" on public.direct_messages for insert to authenticated with check (
  auth.uid()=sender_id and exists(select 1 from public.friendships f where f.id=friendship_id and f.status='accepted' and (auth.uid()=f.requester_id or auth.uid()=f.addressee_id))
);
create policy "recipient marks message read" on public.direct_messages for update to authenticated using (
  sender_id<>auth.uid() and exists(select 1 from public.friendships f where f.id=friendship_id and (auth.uid()=f.requester_id or auth.uid()=f.addressee_id))
);

alter publication supabase_realtime add table public.direct_messages;
