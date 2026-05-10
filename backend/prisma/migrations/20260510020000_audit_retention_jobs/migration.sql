CREATE OR REPLACE FUNCTION public.audit_retention_expires_at(
  p_plan "OrganizationPlan",
  p_created_at timestamp without time zone
)
RETURNS timestamp without time zone
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_plan
    WHEN 'STARTER' THEN p_created_at + INTERVAL '30 days'
    WHEN 'PRO' THEN p_created_at + INTERVAL '90 days'
    WHEN 'ENTERPRISE' THEN NULL
    ELSE p_created_at + INTERVAL '30 days'
  END
$$;

CREATE OR REPLACE FUNCTION public.prune_expired_audit_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.audit_events
  WHERE expires_at IS NOT NULL
    AND expires_at < now();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.extend_audit_event_retention_for_org(
  p_org_id uuid,
  p_new_plan "OrganizationPlan"
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.audit_events
  SET expires_at = CASE
    WHEN public.audit_retention_expires_at(p_new_plan, created_at) IS NULL THEN NULL
    WHEN expires_at IS NULL THEN NULL
    ELSE GREATEST(expires_at, public.audit_retention_expires_at(p_new_plan, created_at))
  END
  WHERE org_id = p_org_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
EXCEPTION
  WHEN insufficient_privilege OR undefined_file THEN
    RAISE NOTICE 'pg_cron extension unavailable; schedule public.prune_expired_audit_events() outside Postgres. %', SQLERRM;
END
$$;

DO $$
BEGIN
  IF to_regnamespace('cron') IS NOT NULL
     AND to_regprocedure('cron.schedule(text,text,text)') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM cron.job
       WHERE jobname = 'mull-prune-expired-audit-events'
     ) THEN
    PERFORM cron.schedule(
      'mull-prune-expired-audit-events',
      '17 3 * * *',
      'SELECT public.prune_expired_audit_events();'
    );
  END IF;
EXCEPTION
  WHEN insufficient_privilege OR undefined_table OR undefined_function THEN
    RAISE NOTICE 'Could not schedule audit prune job in pg_cron; use npm run audit:prune or an external scheduler. %', SQLERRM;
END
$$;
