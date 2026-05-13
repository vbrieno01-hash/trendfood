-- 1. Novas colunas em referral_bonuses
ALTER TABLE public.referral_bonuses
  ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reverted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS flagged_reason TEXT,
  ADD COLUMN IF NOT EXISTS source_payment_id TEXT;

CREATE INDEX IF NOT EXISTS idx_ref_bonuses_pending
  ON public.referral_bonuses (released_at)
  WHERE applied_at IS NULL AND reverted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ref_bonuses_payment
  ON public.referral_bonuses (source_payment_id)
  WHERE source_payment_id IS NOT NULL;

-- 2. Bônus históricos: marca como já aplicados (não mexe em trial_ends_at)
UPDATE public.referral_bonuses
SET applied_at = created_at,
    released_at = created_at
WHERE applied_at IS NULL AND reverted_at IS NULL;

-- 3. Função de validação anti-fraude (BEFORE INSERT)
CREATE OR REPLACE FUNCTION public.validate_referral_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _referrer RECORD;
  _referred RECORD;
  _wa_a TEXT;
  _wa_b TEXT;
  _cnpj_a TEXT;
  _cnpj_b TEXT;
  _monthly_sum INT;
BEGIN
  -- Auto-indicação direta
  IF NEW.referrer_org_id = NEW.referred_org_id THEN
    RAISE EXCEPTION 'Auto-indicação não permitida' USING ERRCODE = 'P0001';
  END IF;

  SELECT user_id, whatsapp, cnpj INTO _referrer
    FROM organizations WHERE id = NEW.referrer_org_id;
  SELECT user_id, whatsapp, cnpj INTO _referred
    FROM organizations WHERE id = NEW.referred_org_id;

  IF _referrer.user_id IS NOT NULL
     AND _referred.user_id IS NOT NULL
     AND _referrer.user_id = _referred.user_id THEN
    RAISE EXCEPTION 'Indicador e indicado têm o mesmo dono' USING ERRCODE = 'P0001';
  END IF;

  _cnpj_a := regexp_replace(COALESCE(_referrer.cnpj, ''), '\D', '', 'g');
  _cnpj_b := regexp_replace(COALESCE(_referred.cnpj, ''), '\D', '', 'g');
  IF char_length(_cnpj_a) >= 11 AND _cnpj_a = _cnpj_b THEN
    RAISE EXCEPTION 'Indicador e indicado têm o mesmo CNPJ/CPF' USING ERRCODE = 'P0001';
  END IF;

  _wa_a := regexp_replace(COALESCE(_referrer.whatsapp, ''), '\D', '', 'g');
  _wa_b := regexp_replace(COALESCE(_referred.whatsapp, ''), '\D', '', 'g');
  IF char_length(_wa_a) >= 10 AND _wa_a = _wa_b THEN
    RAISE EXCEPTION 'Indicador e indicado têm o mesmo WhatsApp' USING ERRCODE = 'P0001';
  END IF;

  -- Limite mensal: 180 dias / 30 dias corridos por referrer.
  -- Acima disso, registra como pendente de revisão (não credita automaticamente).
  SELECT COALESCE(SUM(bonus_days), 0) INTO _monthly_sum
    FROM referral_bonuses
   WHERE referrer_org_id = NEW.referrer_org_id
     AND created_at >= now() - interval '30 days'
     AND reverted_at IS NULL;

  IF (_monthly_sum + NEW.bonus_days) > 180 THEN
    NEW.flagged_reason := 'monthly_limit_exceeded';
    NEW.released_at := NULL; -- segura até admin liberar
  ELSIF NEW.released_at IS NULL THEN
    NEW.released_at := now() + interval '7 days';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_referral_bonus ON public.referral_bonuses;
CREATE TRIGGER validate_referral_bonus
  BEFORE INSERT ON public.referral_bonuses
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_referral_bonus();

-- 4. Função que credita os dias após a carência (idempotente por linha)
CREATE OR REPLACE FUNCTION public.release_pending_referral_bonuses()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bonus RECORD;
  _current TIMESTAMPTZ;
  _new_expiry TIMESTAMPTZ;
  _count INT := 0;
BEGIN
  FOR _bonus IN
    SELECT id, referrer_org_id, bonus_days
      FROM referral_bonuses
     WHERE applied_at IS NULL
       AND reverted_at IS NULL
       AND released_at IS NOT NULL
       AND released_at <= now()
     ORDER BY released_at
     FOR UPDATE SKIP LOCKED
  LOOP
    SELECT trial_ends_at INTO _current
      FROM organizations WHERE id = _bonus.referrer_org_id;

    _current := COALESCE(_current, now());
    IF _current < now() THEN _current := now(); END IF;
    _new_expiry := _current + (_bonus.bonus_days || ' days')::interval;

    UPDATE organizations
       SET trial_ends_at = _new_expiry
     WHERE id = _bonus.referrer_org_id;

    UPDATE referral_bonuses
       SET applied_at = now()
     WHERE id = _bonus.id;

    _count := _count + 1;
  END LOOP;

  RETURN _count;
END;
$$;

-- 5. Função de reversão de bônus quando o pagamento de origem é estornado
CREATE OR REPLACE FUNCTION public.revert_referral_bonus_by_payment(_payment_id TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bonus RECORD;
  _current TIMESTAMPTZ;
  _count INT := 0;
BEGIN
  IF _payment_id IS NULL OR length(_payment_id) = 0 THEN RETURN 0; END IF;

  FOR _bonus IN
    SELECT id, referrer_org_id, bonus_days, applied_at
      FROM referral_bonuses
     WHERE source_payment_id = _payment_id
       AND reverted_at IS NULL
     FOR UPDATE
  LOOP
    -- Se já tinha sido aplicado, desfaz os dias do indicador
    IF _bonus.applied_at IS NOT NULL THEN
      SELECT trial_ends_at INTO _current
        FROM organizations WHERE id = _bonus.referrer_org_id;
      IF _current IS NOT NULL THEN
        UPDATE organizations
           SET trial_ends_at = _current - (_bonus.bonus_days || ' days')::interval
         WHERE id = _bonus.referrer_org_id;
      END IF;
    END IF;

    UPDATE referral_bonuses
       SET reverted_at = now(),
           flagged_reason = COALESCE(flagged_reason, 'payment_refunded')
     WHERE id = _bonus.id;

    _count := _count + 1;
  END LOOP;

  RETURN _count;
END;
$$;

-- 6. pg_cron: roda liberação de bônus a cada hora
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
      FROM cron.job
     WHERE jobname = 'release-referral-bonuses-hourly';

    PERFORM cron.schedule(
      'release-referral-bonuses-hourly',
      '17 * * * *',
      $cron$ SELECT public.release_pending_referral_bonuses(); $cron$
    );
  END IF;
END $$;