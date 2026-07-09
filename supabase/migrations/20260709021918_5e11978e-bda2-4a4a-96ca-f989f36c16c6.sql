
ALTER TABLE public.cleanup_logs DROP CONSTRAINT IF EXISTS cleanup_logs_kind_check;
ALTER TABLE public.cleanup_logs ADD CONSTRAINT cleanup_logs_kind_check
  CHECK (kind = ANY (ARRAY[
    'orphan_image','inactive_org_warned','inactive_org_deleted','orphan_user_deleted',
    'internal_postgres_logs','auto_ttl','auto_ttl_error','auto_ttl_summary'
  ]));
