drop policy if exists "Service role manages job locks" on public.job_locks;
create policy "Service role manages job locks"
  on public.job_locks
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Signed in learners can read link health" on public.link_checks;
create policy "Owner can read link health"
  on public.link_checks
  for select
  to authenticated
  using (
    lower(coalesce(auth.jwt() ->> 'email', '')) in (
      'boleydavid7@outlook.com',
      'boleydavid7@gmail.com'
    )
  );