DROP POLICY IF EXISTS "Friends can read their messages" ON public.direct_messages;
CREATE POLICY "Friends can read their messages" ON public.direct_messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.friendships f WHERE f.id = direct_messages.friendship_id AND f.status = 'accepted' AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())));
DROP POLICY IF EXISTS "Recipients can mark messages read" ON public.direct_messages;
CREATE POLICY "Recipients can mark messages read" ON public.direct_messages FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.friendships f WHERE f.id = direct_messages.friendship_id AND f.status = 'accepted' AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.friendships f WHERE f.id = direct_messages.friendship_id AND f.status = 'accepted' AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())));
DROP POLICY IF EXISTS "Members can update their friendships" ON public.friendships;
CREATE POLICY "Members can update their friendships" ON public.friendships FOR UPDATE TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = addressee_id)
WITH CHECK (auth.uid() = requester_id OR auth.uid() = addressee_id);