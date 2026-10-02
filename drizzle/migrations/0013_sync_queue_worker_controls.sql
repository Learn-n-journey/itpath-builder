-- The queue worker is stopped as soon as the sync queue drains.
CREATE OR REPLACE FUNCTION public.stop_sync_worker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron, extensions
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'it-path-sheet-sync-queue')
     AND NOT EXISTS (SELECT 1 FROM public.sync_queue WHERE status IN ('queued', 'running')) THEN
    PERFORM cron.unschedule('it-path-sheet-sync-queue');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.stop_sync_worker() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stop_sync_worker() TO service_role;
