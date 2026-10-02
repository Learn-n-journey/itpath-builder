-- The sheet-sync worker used to be a cron job posting to the old hosted copy
-- of the app. Nothing schedules it any more: remove the job if it still exists
-- and the function that created it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'it-path-sheet-sync-queue') THEN
    PERFORM cron.unschedule('it-path-sheet-sync-queue');
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.ensure_sync_worker();
