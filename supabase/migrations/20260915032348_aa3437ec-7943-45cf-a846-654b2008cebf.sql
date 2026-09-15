CREATE POLICY "No direct client access to ai events"
  ON public.ai_events
  FOR SELECT
  TO authenticated
  USING (false);