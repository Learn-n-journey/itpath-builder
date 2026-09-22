-- lovable-cron-fallback-reviewed: owner-triggered sync must finish with the app closed; the minute worker is armed on enqueue and unscheduled as soon as the queue drains
CREATE OR REPLACE FUNCTION public.ensure_sync_worker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron, extensions
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'it-path-sheet-sync-queue') THEN
    PERFORM cron.schedule(
      'it-path-sheet-sync-queue',
      '* * * * *',
      $job$
      select net.http_post(
        url := 'https://project--c57050b9-5e1b-487d-b747-1efe1d115881.lovable.app/api/public/sheet-sync',
        headers := '{"Content-Type": "application/json", "x-cron-secret": "87f96a5bf2960867b54472877d7a615d5d479d5efd883ae6"}'::jsonb,
        body := '{"mode": "drain"}'::jsonb
      );
      $job$
    );
  END IF;
END;
$$;

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

REVOKE ALL ON FUNCTION public.ensure_sync_worker() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.stop_sync_worker() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_sync_worker() TO service_role;
GRANT EXECUTE ON FUNCTION public.stop_sync_worker() TO service_role;
