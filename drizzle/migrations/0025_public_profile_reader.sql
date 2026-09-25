create or replace function public.get_public_profiles(_ids uuid[])
returns table(user_id uuid, first_name text, display_name text, avatar_url text, bio text, currently_learning text, learning_goal text, show_learning_progress boolean, show_learning_goal boolean, show_achievements boolean)
language sql stable security definer set search_path = public
as $$
  select p.user_id, p.first_name, p.display_name, p.avatar_url, p.bio,
    case when p.show_learning_progress then p.currently_learning end,
    case when p.show_learning_goal then p.learning_goal end,
    p.show_learning_progress, p.show_learning_goal, p.show_achievements
  from public.profiles p
  where auth.uid() is not null and p.user_id = any(_ids)
$$;
revoke all on function public.get_public_profiles(uuid[]) from public, anon;
grant execute on function public.get_public_profiles(uuid[]) to authenticated;