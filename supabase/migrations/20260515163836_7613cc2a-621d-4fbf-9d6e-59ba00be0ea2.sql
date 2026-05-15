
-- ═══════════════════════════════════════════════════════════════
-- 1. TABELA: cleanup_config (configuração global de limpeza)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.cleanup_config (
  id INT PRIMARY KEY DEFAULT 1,
  dry_run BOOLEAN NOT NULL DEFAULT TRUE,
  dry_run_until TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cleanup_config_singleton CHECK (id = 1)
);

INSERT INTO public.cleanup_config (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.cleanup_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cleanup_config_admin_select" ON public.cleanup_config
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "cleanup_config_admin_update" ON public.cleanup_config
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════════
-- 2. TABELA: cleanup_logs (auditoria do que foi/seria apagado)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.cleanup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('orphan_image','inactive_org_warned','inactive_org_deleted','orphan_user_deleted')),
  target TEXT NOT NULL,
  bucket TEXT,
  size_bytes BIGINT,
  reason TEXT,
  dry_run BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cleanup_logs_created_at ON public.cleanup_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_kind ON public.cleanup_logs (kind);

ALTER TABLE public.cleanup_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cleanup_logs_admin_select" ON public.cleanup_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
-- Inserts only via SECURITY DEFINER functions; nenhuma policy de INSERT pra cliente

-- ═══════════════════════════════════════════════════════════════
-- 3. COLUNA: organizations.cleanup_warning_at
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS cleanup_warning_at TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════════
-- 4. FUNÇÃO: cleanup_inactive_organizations()
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cleanup_inactive_organizations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _config RECORD;
  _is_dry_run BOOLEAN;
  _admin_email TEXT := 'brenojackson30@gmail.com';
  _org RECORD;
  _user_id UUID;
  _user_email TEXT;
  _other_orgs INT;
  _warned_count INT := 0;
  _deleted_count INT := 0;
  _users_deleted INT := 0;
BEGIN
  SELECT dry_run, enabled INTO _config FROM public.cleanup_config WHERE id = 1;
  IF NOT FOUND OR NOT _config.enabled THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'disabled');
  END IF;
  _is_dry_run := _config.dry_run;

  -- Etapa 1: marcar (warn) novas orgs que entraram no critério
  FOR _org IN
    SELECT o.id, o.name, o.user_id, o.created_at, o.subscription_plan, o.trial_ends_at
    FROM public.organizations o
    WHERE o.created_at < now() - interval '5 months'
      AND o.subscription_plan = 'free'
      AND (o.trial_ends_at IS NULL OR o.trial_ends_at < now())
      AND o.referred_by_id IS NULL
      AND o.affiliate_id IS NULL
      AND o.cleanup_warning_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.orders ord WHERE ord.organization_id = o.id)
      AND (
        o.onboarding_done = false
        OR NOT EXISTS (SELECT 1 FROM public.menu_items mi WHERE mi.organization_id = o.id)
      )
      AND NOT EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = o.user_id AND u.email = _admin_email
      )
  LOOP
    -- Sempre marca (mesmo em dry-run, para o ciclo de aviso funcionar)
    UPDATE public.organizations
       SET cleanup_warning_at = now()
     WHERE id = _org.id;

    INSERT INTO public.cleanup_logs (kind, target, reason, dry_run, metadata)
    VALUES (
      'inactive_org_warned',
      _org.id::text,
      'Loja inativa: criada em ' || to_char(_org.created_at, 'YYYY-MM-DD') ||
        ', plano free, sem pedidos, sem produtos/onboarding. Apagada se continuar inativa em 7 dias.',
      _is_dry_run,
      jsonb_build_object('org_name', _org.name, 'user_id', _org.user_id)
    );
    _warned_count := _warned_count + 1;
  END LOOP;

  -- Etapa 2: deletar orgs avisadas há mais de 7 dias (se ainda inativas)
  FOR _org IN
    SELECT o.id, o.name, o.user_id, o.cleanup_warning_at
    FROM public.organizations o
    WHERE o.cleanup_warning_at IS NOT NULL
      AND o.cleanup_warning_at < now() - interval '7 days'
      AND o.subscription_plan = 'free'
      AND (o.trial_ends_at IS NULL OR o.trial_ends_at < now())
      AND o.referred_by_id IS NULL
      AND o.affiliate_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.orders ord WHERE ord.organization_id = o.id)
      AND (
        o.onboarding_done = false
        OR NOT EXISTS (SELECT 1 FROM public.menu_items mi WHERE mi.organization_id = o.id)
      )
      AND NOT EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = o.user_id AND u.email = _admin_email
      )
  LOOP
    SELECT email INTO _user_email FROM auth.users WHERE id = _org.user_id;

    INSERT INTO public.cleanup_logs (kind, target, reason, dry_run, metadata)
    VALUES (
      'inactive_org_deleted',
      _org.id::text,
      'Loja inativa há mais de 5 meses, avisada há mais de 7 dias.',
      _is_dry_run,
      jsonb_build_object('org_name', _org.name, 'user_id', _org.user_id, 'user_email', _user_email)
    );

    IF NOT _is_dry_run THEN
      _user_id := _org.user_id;
      DELETE FROM public.organizations WHERE id = _org.id;
      _deleted_count := _deleted_count + 1;

      -- Se o user não tem mais nenhuma org, remove o auth.users também
      SELECT count(*) INTO _other_orgs
      FROM public.organizations
      WHERE user_id = _user_id;

      IF _other_orgs = 0 AND _user_email IS NOT NULL AND _user_email <> _admin_email THEN
        INSERT INTO public.cleanup_logs (kind, target, reason, dry_run, metadata)
        VALUES (
          'orphan_user_deleted',
          _user_id::text,
          'Usuário sem nenhuma loja após limpeza.',
          false,
          jsonb_build_object('email', _user_email)
        );
        DELETE FROM auth.users WHERE id = _user_id;
        _users_deleted := _users_deleted + 1;
      END IF;
    ELSE
      _deleted_count := _deleted_count + 1; -- contagem do que SERIA apagado
    END IF;
  END LOOP;

  -- Health
  INSERT INTO public.cron_health (job_name, last_success_at, last_run_count)
  VALUES ('cleanup_inactive_organizations', now(), _warned_count + _deleted_count)
  ON CONFLICT (job_name) DO UPDATE
    SET last_success_at = EXCLUDED.last_success_at,
        last_run_count  = EXCLUDED.last_run_count;

  RETURN jsonb_build_object(
    'dry_run', _is_dry_run,
    'warned', _warned_count,
    'would_delete_or_deleted', _deleted_count,
    'users_deleted', _users_deleted
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 5. RPC para o painel admin: stats e limpeza manual
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_cleanup_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = 'P0001';
  END IF;

  SELECT jsonb_build_object(
    'config', (SELECT row_to_json(c) FROM public.cleanup_config c WHERE id = 1),
    'orphan_images_count', (SELECT count(*) FROM public.cleanup_logs WHERE kind = 'orphan_image' AND created_at >= now() - interval '30 days'),
    'orphan_images_bytes', COALESCE((SELECT SUM(size_bytes) FROM public.cleanup_logs WHERE kind = 'orphan_image' AND created_at >= now() - interval '30 days'), 0),
    'inactive_orgs_warned', (SELECT count(*) FROM public.organizations WHERE cleanup_warning_at IS NOT NULL),
    'inactive_orgs_logged', (SELECT count(*) FROM public.cleanup_logs WHERE kind IN ('inactive_org_warned','inactive_org_deleted') AND created_at >= now() - interval '30 days')
  ) INTO _result;

  RETURN _result;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_cleanup_dry_run(_dry_run BOOLEAN)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.cleanup_config
     SET dry_run = _dry_run, updated_at = now()
   WHERE id = 1;

  RETURN jsonb_build_object('success', true, 'dry_run', _dry_run);
END;
$$;

CREATE OR REPLACE FUNCTION public.run_cleanup_orgs_manual()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = 'P0001';
  END IF;

  RETURN public.cleanup_inactive_organizations();
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 6. AGENDAMENTO pg_cron: orgs (toda segunda 04:00 BRT = 07:00 UTC)
-- ═══════════════════════════════════════════════════════════════
SELECT cron.unschedule('cleanup_inactive_orgs_weekly')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup_inactive_orgs_weekly');

SELECT cron.schedule(
  'cleanup_inactive_orgs_weekly',
  '0 7 * * 1',
  $cron$ SELECT public.cleanup_inactive_organizations(); $cron$
);
