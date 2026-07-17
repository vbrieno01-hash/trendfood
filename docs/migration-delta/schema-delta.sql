-- ============================================================
-- TrendFood — schema delta desde backup 2026-07-09
-- Gerado em: 2026-07-17 (atualizado — inclui migrations até 17/07)
-- Aplicar no projeto espelho: eqyklkrigshbjuneuxrz
-- Cole tudo no SQL Editor e clique em Run.
-- Reexecutável: erros de "already exists" são esperados/ignorados.
-- ============================================================


-- ============================================================
-- >>> 20260709030754_572082a0-eb05-4c6e-84e3-b4cecab28d96.sql
-- ============================================================
-- Fase 2 do Controle de Caixa: rastreabilidade de operador + divergência
-- 100% aditivo. Colunas nullable. Nada existente é modificado.

ALTER TABLE public.cash_sessions
  ADD COLUMN IF NOT EXISTS opened_by UUID,
  ADD COLUMN IF NOT EXISTS closed_by UUID,
  ADD COLUMN IF NOT EXISTS divergence_reason TEXT;

COMMENT ON COLUMN public.cash_sessions.opened_by IS 'auth.users.id do operador que abriu o turno';
COMMENT ON COLUMN public.cash_sessions.closed_by IS 'auth.users.id do operador que fechou o turno';
COMMENT ON COLUMN public.cash_sessions.divergence_reason IS 'Justificativa quando a diferença esperado x contado ultrapassa o limite';

-- Index útil pra buscar todos os turnos de um operador
CREATE INDEX IF NOT EXISTS idx_cash_sessions_opened_by
  ON public.cash_sessions (opened_by)
  WHERE opened_by IS NOT NULL;

-- ============================================================
-- >>> 20260709034138_df14346e-0a38-4d93-aad1-b79c101f044d.sql
-- ============================================================

-- ============================================================
-- Hardening de segurança do Fluxo de Caixa
-- Triggers de integridade + remoção de DELETE do owner
-- 100% aditiva. Não altera dados existentes.
-- ============================================================

-- 1) Remover DELETE do owner (audit trail). Admin continua podendo.
DROP POLICY IF EXISTS cash_sessions_delete_owner ON public.cash_sessions;
DROP POLICY IF EXISTS cash_withdrawals_delete_owner ON public.cash_withdrawals;

-- 2) Trigger de integridade em cash_sessions
CREATE OR REPLACE FUNCTION public.enforce_cash_session_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  is_admin := auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role);

  IF TG_OP = 'INSERT' THEN
    -- Admin pode setar opened_by livremente. Owner: força = auth.uid().
    IF NOT is_admin THEN
      IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória para abrir caixa';
      END IF;
      NEW.opened_by := auth.uid();
      -- Turno sempre nasce aberto
      NEW.closed_at := NULL;
      NEW.closed_by := NULL;
      NEW.closing_balance := NULL;
      NEW.divergence_reason := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Admin passa livre (bypass emergencial)
    IF is_admin THEN
      RETURN NEW;
    END IF;

    -- Imutáveis após criação
    IF NEW.opened_at IS DISTINCT FROM OLD.opened_at THEN
      RAISE EXCEPTION 'opened_at é imutável';
    END IF;
    IF NEW.opening_balance IS DISTINCT FROM OLD.opening_balance THEN
      RAISE EXCEPTION 'opening_balance é imutável';
    END IF;
    IF NEW.opened_by IS DISTINCT FROM OLD.opened_by THEN
      RAISE EXCEPTION 'opened_by é imutável';
    END IF;
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
      RAISE EXCEPTION 'organization_id é imutável';
    END IF;

    -- Bloqueia reabrir turno já fechado
    IF OLD.closed_at IS NOT NULL THEN
      RAISE EXCEPTION 'Turno já fechado não pode ser alterado';
    END IF;

    -- Ao fechar, força closed_by = auth.uid()
    IF NEW.closed_at IS NOT NULL THEN
      IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória para fechar caixa';
      END IF;
      NEW.closed_by := auth.uid();
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_cash_session_integrity ON public.cash_sessions;
DROP TRIGGER IF EXISTS trg_enforce_cash_session_integrity ON public.cash_sessions;
CREATE TRIGGER trg_enforce_cash_session_integrity
  BEFORE INSERT OR UPDATE ON public.cash_sessions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_cash_session_integrity();

-- 3) Trigger de integridade em cash_withdrawals
CREATE OR REPLACE FUNCTION public.enforce_cash_withdrawal_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  session_closed_at timestamptz;
  session_org uuid;
BEGIN
  is_admin := auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role);

  IF TG_OP = 'INSERT' THEN
    SELECT closed_at, organization_id
      INTO session_closed_at, session_org
      FROM public.cash_sessions
     WHERE id = NEW.session_id;

    IF session_org IS NULL THEN
      RAISE EXCEPTION 'Sessão de caixa não encontrada';
    END IF;

    IF session_org IS DISTINCT FROM NEW.organization_id THEN
      RAISE EXCEPTION 'organization_id da movimentação não bate com a sessão';
    END IF;

    IF session_closed_at IS NOT NULL AND NOT is_admin THEN
      RAISE EXCEPTION 'Não é possível adicionar movimentação em turno fechado';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF is_admin THEN
      RETURN NEW;
    END IF;
    -- Movimentações são imutáveis para owner (audit trail)
    IF NEW.session_id IS DISTINCT FROM OLD.session_id
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.movement_type IS DISTINCT FROM OLD.movement_type THEN
      RAISE EXCEPTION 'Campos críticos da movimentação são imutáveis';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_cash_withdrawal_integrity ON public.cash_withdrawals;
DROP TRIGGER IF EXISTS trg_enforce_cash_withdrawal_integrity ON public.cash_withdrawals;
CREATE TRIGGER trg_enforce_cash_withdrawal_integrity
  BEFORE INSERT OR UPDATE ON public.cash_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_cash_withdrawal_integrity();


-- ============================================================
-- >>> 20260710031400_f4ed2989-2bf3-4882-ae2a-f83330cfaec2.sql
-- ============================================================
-- ============================================================
-- ONDA 1: Estrutura de banco pro Add-on "Campanhas WhatsApp"
-- ============================================================

-- 1) TABELA: campaign_credits (saldo mensal por loja)
CREATE TABLE IF NOT EXISTS public.campaign_credits (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id         text NOT NULL DEFAULT 'basic_250',
  credits_total   integer NOT NULL DEFAULT 250,
  credits_used    integer NOT NULL DEFAULT 0,
  period_start    timestamptz NOT NULL DEFAULT now(),
  period_end      timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  mp_subscription_id text,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','canceled','expired','trial')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id)
);
CREATE INDEX IF NOT EXISTS idx_campaign_credits_org ON public.campaign_credits(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaign_credits_status ON public.campaign_credits(status) WHERE status = 'active';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_credits TO authenticated;
GRANT ALL ON public.campaign_credits TO service_role;

ALTER TABLE public.campaign_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_credits_select_owner" ON public.campaign_credits;
CREATE POLICY "campaign_credits_select_owner" ON public.campaign_credits FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = campaign_credits.organization_id));
DROP POLICY IF EXISTS "campaign_credits_select_admin" ON public.campaign_credits;
CREATE POLICY "campaign_credits_select_admin" ON public.campaign_credits FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "campaign_credits_insert_owner" ON public.campaign_credits;
CREATE POLICY "campaign_credits_insert_owner" ON public.campaign_credits FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = campaign_credits.organization_id));
DROP POLICY IF EXISTS "campaign_credits_update_owner" ON public.campaign_credits;
CREATE POLICY "campaign_credits_update_owner" ON public.campaign_credits FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = campaign_credits.organization_id));
DROP POLICY IF EXISTS "campaign_credits_update_admin" ON public.campaign_credits;
CREATE POLICY "campaign_credits_update_admin" ON public.campaign_credits FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "campaign_credits_delete_admin" ON public.campaign_credits;
CREATE POLICY "campaign_credits_delete_admin" ON public.campaign_credits FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) TABELA: campaigns (campanhas criadas)
CREATE TABLE IF NOT EXISTS public.campaigns (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name              text NOT NULL,
  target_filter     jsonb NOT NULL DEFAULT '{"inactive_days": 30}'::jsonb,
  message_template  text NOT NULL,
  coupon_id         uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  total_recipients  integer NOT NULL DEFAULT 0,
  sent_count        integer NOT NULL DEFAULT 0,
  status            text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sending','completed','failed','canceled')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz
);
CREATE INDEX IF NOT EXISTS idx_campaigns_org_created ON public.campaigns(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status) WHERE status IN ('draft','sending');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaigns_select_owner" ON public.campaigns;
CREATE POLICY "campaigns_select_owner" ON public.campaigns FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = campaigns.organization_id));
DROP POLICY IF EXISTS "campaigns_select_admin" ON public.campaigns;
CREATE POLICY "campaigns_select_admin" ON public.campaigns FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "campaigns_insert_owner" ON public.campaigns;
CREATE POLICY "campaigns_insert_owner" ON public.campaigns FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = campaigns.organization_id));
DROP POLICY IF EXISTS "campaigns_update_owner" ON public.campaigns;
CREATE POLICY "campaigns_update_owner" ON public.campaigns FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = campaigns.organization_id));
DROP POLICY IF EXISTS "campaigns_delete_owner" ON public.campaigns;
CREATE POLICY "campaigns_delete_owner" ON public.campaigns FOR DELETE
  USING (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = campaigns.organization_id));

-- 3) TABELA: campaign_recipients (telefones de cada campanha)
CREATE TABLE IF NOT EXISTS public.campaign_recipients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  phone         text NOT NULL,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','queued','sent','failed','skipped')),
  outbox_id     uuid REFERENCES public.whatsapp_outbox(id) ON DELETE SET NULL,
  error         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  sent_at       timestamptz,
  UNIQUE (campaign_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON public.campaign_recipients(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_org ON public.campaign_recipients(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_recipients TO authenticated;
GRANT ALL ON public.campaign_recipients TO service_role;

ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_recipients_select_owner" ON public.campaign_recipients;
CREATE POLICY "campaign_recipients_select_owner" ON public.campaign_recipients FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = campaign_recipients.organization_id));
DROP POLICY IF EXISTS "campaign_recipients_select_admin" ON public.campaign_recipients;
CREATE POLICY "campaign_recipients_select_admin" ON public.campaign_recipients FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "campaign_recipients_insert_owner" ON public.campaign_recipients;
CREATE POLICY "campaign_recipients_insert_owner" ON public.campaign_recipients FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = campaign_recipients.organization_id));
DROP POLICY IF EXISTS "campaign_recipients_update_owner" ON public.campaign_recipients;
CREATE POLICY "campaign_recipients_update_owner" ON public.campaign_recipients FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = campaign_recipients.organization_id));
DROP POLICY IF EXISTS "campaign_recipients_delete_owner" ON public.campaign_recipients;
CREATE POLICY "campaign_recipients_delete_owner" ON public.campaign_recipients FOR DELETE
  USING (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = campaign_recipients.organization_id));

-- 4) Trigger de updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_campaign_credits_updated ON public.campaign_credits;
CREATE TRIGGER trg_campaign_credits_updated
  BEFORE UPDATE ON public.campaign_credits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_campaigns_updated ON public.campaigns;
CREATE TRIGGER trg_campaigns_updated
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) FUNÇÃO: buscar clientes inativos há X dias
CREATE OR REPLACE FUNCTION public.get_inactive_customers(
  _organization_id uuid,
  _inactive_days   integer DEFAULT 30
)
RETURNS TABLE (phone text, last_order_at timestamptz, total_spent numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lp.phone,
    lp.updated_at AS last_order_at,
    lp.total_spent
  FROM public.loyalty_points lp
  WHERE lp.organization_id = _organization_id
    AND lp.updated_at < (now() - make_interval(days => _inactive_days))
    AND lp.phone ~ '^[0-9]{10,13}$'
  ORDER BY lp.updated_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_inactive_customers(uuid, integer) TO authenticated;

-- 6) FUNÇÃO: contar quantos clientes inativos existem
CREATE OR REPLACE FUNCTION public.count_inactive_customers(
  _organization_id uuid,
  _inactive_days   integer DEFAULT 30
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.loyalty_points lp
  WHERE lp.organization_id = _organization_id
    AND lp.updated_at < (now() - make_interval(days => _inactive_days))
    AND lp.phone ~ '^[0-9]{10,13}$';
$$;

GRANT EXECUTE ON FUNCTION public.count_inactive_customers(uuid, integer) TO authenticated;

-- 7) FUNÇÃO ATÔMICA: consumir créditos e enfileirar campanha
-- Chamada pelo backend (Edge Function). Valida saldo, cria recipients + outbox em batch.
CREATE OR REPLACE FUNCTION public.enqueue_campaign(
  _campaign_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign      public.campaigns%ROWTYPE;
  v_credits       public.campaign_credits%ROWTYPE;
  v_available     integer;
  v_org_name      text;
  v_recipient     RECORD;
  v_msg           text;
  v_outbox_id     uuid;
  v_enqueued      integer := 0;
  v_skipped       integer := 0;
BEGIN
  -- Trava a campanha
  SELECT * INTO v_campaign FROM public.campaigns WHERE id = _campaign_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'campaign_not_found');
  END IF;

  IF v_campaign.status <> 'draft' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_status', 'status', v_campaign.status);
  END IF;

  -- Trava os créditos
  SELECT * INTO v_credits FROM public.campaign_credits
    WHERE organization_id = v_campaign.organization_id FOR UPDATE;
  IF NOT FOUND OR v_credits.status <> 'active' OR v_credits.period_end < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_active_subscription');
  END IF;

  v_available := v_credits.credits_total - v_credits.credits_used;
  IF v_available <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_credits', 'available', 0);
  END IF;

  -- Nome da loja pra template
  SELECT name INTO v_org_name FROM public.organizations WHERE id = v_campaign.organization_id;

  -- Marca como sending
  UPDATE public.campaigns SET status = 'sending' WHERE id = _campaign_id;

  -- Percorre recipients pending, respeitando o saldo
  FOR v_recipient IN
    SELECT id, phone FROM public.campaign_recipients
    WHERE campaign_id = _campaign_id AND status = 'pending'
    ORDER BY created_at
    LIMIT v_available
  LOOP
    -- Aplica template
    v_msg := replace(v_campaign.message_template, '{loja}', coalesce(v_org_name, ''));
    v_msg := v_msg || E'\n\n_Para não receber mais, responda SAIR._';

    -- Enfileira na outbox
    INSERT INTO public.whatsapp_outbox (organization_id, phone, message, event_type, status)
    VALUES (v_campaign.organization_id, v_recipient.phone, v_msg, 'campaign', 'pending')
    RETURNING id INTO v_outbox_id;

    -- Marca recipient como queued
    UPDATE public.campaign_recipients
      SET status = 'queued', outbox_id = v_outbox_id
      WHERE id = v_recipient.id;

    v_enqueued := v_enqueued + 1;
  END LOOP;

  -- Marca skipped os que sobraram por falta de saldo
  UPDATE public.campaign_recipients
    SET status = 'skipped', error = 'no_credits'
    WHERE campaign_id = _campaign_id AND status = 'pending';
  GET DIAGNOSTICS v_skipped = ROW_COUNT;

  -- Debita créditos
  UPDATE public.campaign_credits
    SET credits_used = credits_used + v_enqueued
    WHERE organization_id = v_campaign.organization_id;

  -- Atualiza contadores da campanha
  UPDATE public.campaigns
    SET sent_count = v_enqueued,
        status = CASE WHEN v_skipped > 0 THEN 'completed' ELSE 'completed' END,
        completed_at = now()
    WHERE id = _campaign_id;

  RETURN jsonb_build_object(
    'ok', true,
    'enqueued', v_enqueued,
    'skipped', v_skipped,
    'remaining_credits', v_credits.credits_total - v_credits.credits_used - v_enqueued
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_campaign(uuid) TO authenticated;


-- ============================================================
-- >>> 20260710033434_ee06affd-c341-4919-85ed-204fa3102a8f.sql
-- ============================================================

-- 1) Realtime pra campaign_credits (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'campaign_credits'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_credits';
  END IF;
END $$;

ALTER TABLE public.campaign_credits REPLICA IDENTITY FULL;

-- 2) RPC pra somar créditos e estender vigência de forma atômica
CREATE OR REPLACE FUNCTION public.apply_campaign_credits_purchase(
  _org_id UUID,
  _credits INT DEFAULT 250,
  _days INT DEFAULT 30,
  _payment_id TEXT DEFAULT NULL
)
RETURNS public.campaign_credits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.campaign_credits;
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT * INTO v_row
  FROM public.campaign_credits
  WHERE organization_id = _org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.campaign_credits (
      organization_id, plan_id, credits_total, credits_used,
      period_start, period_end, status
    ) VALUES (
      _org_id, 'basic_250', _credits, 0,
      v_now, v_now + make_interval(days => _days), 'active'
    )
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.campaign_credits
    SET
      credits_total = CASE
        WHEN status = 'active' AND period_end > v_now
          THEN credits_total + _credits
        ELSE _credits
      END,
      credits_used = CASE
        WHEN status = 'active' AND period_end > v_now
          THEN credits_used
        ELSE 0
      END,
      period_start = CASE
        WHEN status = 'active' AND period_end > v_now
          THEN period_start
        ELSE v_now
      END,
      period_end = CASE
        WHEN status = 'active' AND period_end > v_now
          THEN period_end + make_interval(days => _days)
        ELSE v_now + make_interval(days => _days)
      END,
      status = 'active',
      updated_at = v_now
    WHERE organization_id = _org_id
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_campaign_credits_purchase(UUID, INT, INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_campaign_credits_purchase(UUID, INT, INT, TEXT) TO service_role;


-- ============================================================
-- >>> 20260710035758_8d1431ac-9664-4020-be64-5101d2e3bfb4.sql
-- ============================================================
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS daily_send_limit integer NOT NULL DEFAULT 300;

-- ============================================================
-- >>> 20260710042150_2215fa34-61cf-4ed8-b369-8aeb7645026f.sql
-- ============================================================

-- 1) Coluna processing_started_at
ALTER TABLE public.whatsapp_outbox
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_wa_outbox_processing_started
  ON public.whatsapp_outbox (processing_started_at)
  WHERE status = 'processing';

-- 2) Trigger de dedupe (janela 5min)
-- Bloqueia inserts com msg idêntica pra mesmo phone/org que já esteja pending/processing/sent recente.
CREATE OR REPLACE FUNCTION public.wa_outbox_dedup_recent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.whatsapp_outbox
    WHERE organization_id = NEW.organization_id
      AND phone = NEW.phone
      AND md5(message) = md5(NEW.message)
      AND status IN ('pending','processing','sent')
      AND created_at > (now() - interval '5 minutes')
  ) INTO v_exists;

  IF v_exists THEN
    RAISE EXCEPTION 'duplicate_message_within_5min'
      USING ERRCODE = 'unique_violation',
            HINT = 'Mensagem idêntica pra este número enfileirada/enviada nos últimos 5 minutos.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wa_outbox_dedup ON public.whatsapp_outbox;
DROP TRIGGER IF EXISTS trg_wa_outbox_dedup ON public.whatsapp_outbox;
CREATE TRIGGER trg_wa_outbox_dedup
  BEFORE INSERT ON public.whatsapp_outbox
  FOR EACH ROW EXECUTE FUNCTION public.wa_outbox_dedup_recent();

-- 3) Claim atômico com SKIP LOCKED
CREATE OR REPLACE FUNCTION public.claim_outbox_batch(_limit int DEFAULT 15, _max_attempts int DEFAULT 3)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  phone text,
  message text,
  attempts int,
  event_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT o.id
    FROM public.whatsapp_outbox o
    WHERE o.status = 'pending'
      AND o.attempts < _max_attempts
    ORDER BY o.created_at
    LIMIT _limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.whatsapp_outbox w
    SET status = 'processing',
        attempts = w.attempts + 1,
        processing_started_at = now()
    FROM claimed c
    WHERE w.id = c.id
    RETURNING w.id, w.organization_id, w.phone, w.message, w.attempts, w.event_type;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_outbox_batch(int, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_outbox_batch(int, int) TO service_role;


-- ============================================================
-- >>> 20260710060452_c76eb515-f192-43c7-98ad-f5adf3be9cd8.sql
-- ============================================================

-- ============================================================
-- Bloco 1: Lucro real por produto (últimos N dias)
-- ============================================================
CREATE OR REPLACE FUNCTION public.intel_profit_analysis(p_org_id uuid, p_days integer DEFAULT 30)
RETURNS TABLE (
  menu_item_id uuid,
  name text,
  quantity_sold bigint,
  revenue numeric,
  cost numeric,
  profit numeric,
  margin_pct numeric,
  has_recipe boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH valid_orders AS (
    SELECT id
    FROM orders
    WHERE organization_id = p_org_id
      AND status <> 'cancelled'
      AND created_at >= now() - make_interval(days => p_days)
  ),
  items AS (
    SELECT oi.menu_item_id, oi.name, oi.price, oi.quantity
    FROM order_items oi
    JOIN valid_orders vo ON vo.id = oi.order_id
    WHERE oi.menu_item_id IS NOT NULL
  ),
  costs AS (
    SELECT mi.menu_item_id, SUM(mi.quantity_used * COALESCE(si.cost_per_unit, 0))::numeric AS unit_cost
    FROM menu_item_ingredients mi
    LEFT JOIN stock_items si ON si.id = mi.stock_item_id
    GROUP BY mi.menu_item_id
  )
  SELECT
    i.menu_item_id,
    COALESCE(
      NULLIF(NULLIF(MAX(i.name), ''), '.'),
      NULLIF(NULLIF(MAX(m.name), ''), '.'),
      '(sem nome)'
    ) AS name,
    SUM(i.quantity)::bigint AS quantity_sold,
    SUM(i.quantity * i.price)::numeric AS revenue,
    SUM(i.quantity * COALESCE(c.unit_cost, 0))::numeric AS cost,
    (SUM(i.quantity * i.price) - SUM(i.quantity * COALESCE(c.unit_cost, 0)))::numeric AS profit,
    CASE WHEN SUM(i.quantity * i.price) > 0
      THEN ((SUM(i.quantity * i.price) - SUM(i.quantity * COALESCE(c.unit_cost, 0))) / SUM(i.quantity * i.price) * 100)::numeric
      ELSE 0
    END AS margin_pct,
    (c.unit_cost IS NOT NULL) AS has_recipe
  FROM items i
  LEFT JOIN menu_items m ON m.id = i.menu_item_id
  LEFT JOIN costs c ON c.menu_item_id = i.menu_item_id
  GROUP BY i.menu_item_id, c.unit_cost
  ORDER BY profit DESC;
$$;

GRANT EXECUTE ON FUNCTION public.intel_profit_analysis(uuid, integer) TO authenticated;

-- ============================================================
-- Bloco 2: Mapa de calor 7×24 (últimos N dias, horário Brasília UTC-3)
-- ============================================================
CREATE OR REPLACE FUNCTION public.intel_orders_heatmap(p_org_id uuid, p_days integer DEFAULT 30)
RETURNS TABLE (day_of_week integer, hour_of_day integer, order_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    EXTRACT(DOW FROM (created_at AT TIME ZONE 'America/Sao_Paulo'))::integer AS day_of_week,
    EXTRACT(HOUR FROM (created_at AT TIME ZONE 'America/Sao_Paulo'))::integer AS hour_of_day,
    COUNT(*)::bigint AS order_count
  FROM orders
  WHERE organization_id = p_org_id
    AND status <> 'cancelled'
    AND created_at >= now() - make_interval(days => p_days)
  GROUP BY day_of_week, hour_of_day;
$$;

GRANT EXECUTE ON FUNCTION public.intel_orders_heatmap(uuid, integer) TO authenticated;

-- ============================================================
-- Bloco 3: Previsão semanal (5 buckets: 4 anteriores + atual)
-- ============================================================
CREATE OR REPLACE FUNCTION public.intel_week_forecast(p_org_id uuid)
RETURNS TABLE (weeks_ago integer, revenue numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH this_week_start AS (
    SELECT date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo')::timestamp AS wk
  ),
  lookback AS (
    SELECT (wk - interval '4 weeks') AS start_ts, wk FROM this_week_start
  ),
  valid_orders AS (
    SELECT o.id,
      FLOOR(EXTRACT(EPOCH FROM ((SELECT wk FROM this_week_start) - date_trunc('week', o.created_at AT TIME ZONE 'America/Sao_Paulo'))) / 604800)::integer AS wago
    FROM orders o, lookback l
    WHERE o.organization_id = p_org_id
      AND o.status <> 'cancelled'
      AND o.created_at >= l.start_ts
  ),
  order_totals AS (
    SELECT vo.wago, SUM(oi.price * oi.quantity)::numeric AS total
    FROM valid_orders vo
    JOIN order_items oi ON oi.order_id = vo.id
    WHERE vo.wago BETWEEN 0 AND 4
    GROUP BY vo.wago
  )
  SELECT wago AS weeks_ago, COALESCE(total, 0)::numeric AS revenue
  FROM generate_series(0, 4) AS wago
  LEFT JOIN order_totals USING (wago)
  ORDER BY wago;
$$;

GRANT EXECUTE ON FUNCTION public.intel_week_forecast(uuid) TO authenticated;

-- ============================================================
-- Bloco 4: Alertas inteligentes
-- ============================================================
CREATE OR REPLACE FUNCTION public.intel_smart_alerts(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_recent_rev numeric := 0;
  v_prior_rev numeric := 0;
  v_delta numeric := 0;
  v_idle jsonb := '[]'::jsonb;
  v_loyal_missing integer := 0;
  v_result jsonb := '{}'::jsonb;
BEGIN
  -- 1) Comparação 30d atuais vs 30d anteriores (usa 60d)
  WITH valid_orders AS (
    SELECT o.id, o.created_at
    FROM orders o
    WHERE o.organization_id = p_org_id
      AND o.status <> 'cancelled'
      AND o.created_at >= now() - interval '60 days'
  ),
  rev AS (
    SELECT vo.created_at, SUM(oi.price * oi.quantity)::numeric AS total
    FROM valid_orders vo
    JOIN order_items oi ON oi.order_id = vo.id
    GROUP BY vo.created_at
  )
  SELECT
    COALESCE(SUM(CASE WHEN created_at >= now() - interval '30 days' THEN total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN created_at < now() - interval '30 days' THEN total ELSE 0 END), 0)
  INTO v_recent_rev, v_prior_rev
  FROM rev;

  IF v_prior_rev > 0 THEN
    v_delta := ((v_recent_rev - v_prior_rev) / v_prior_rev) * 100;
  END IF;

  -- 2) Produtos parados (venderam entre 45-15d atrás, nada nos últimos 15d)
  WITH valid_orders AS (
    SELECT id, created_at
    FROM orders
    WHERE organization_id = p_org_id
      AND status <> 'cancelled'
      AND created_at >= now() - interval '45 days'
  ),
  sold AS (
    SELECT oi.menu_item_id,
      MAX(oi.name) AS name,
      BOOL_OR(vo.created_at >= now() - interval '15 days') AS sold_recent,
      BOOL_OR(vo.created_at < now() - interval '15 days') AS sold_old
    FROM order_items oi
    JOIN valid_orders vo ON vo.id = oi.order_id
    WHERE oi.menu_item_id IS NOT NULL
    GROUP BY oi.menu_item_id
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', menu_item_id, 'name', COALESCE(NULLIF(name, ''), 'produto'))), '[]'::jsonb)
  INTO v_idle
  FROM (
    SELECT menu_item_id, name FROM sold
    WHERE sold_old AND NOT sold_recent
    LIMIT 3
  ) t;

  -- 3) Clientes fiéis sumidos (3+ pedidos em 90d, último há 20+ dias)
  WITH phones AS (
    SELECT
      regexp_replace(substring(notes FROM 'TEL:([^|]+)'), '\D', '', 'g') AS phone,
      created_at
    FROM orders
    WHERE organization_id = p_org_id
      AND status <> 'cancelled'
      AND created_at >= now() - interval '90 days'
      AND notes ~ 'TEL:'
  ),
  stats AS (
    SELECT phone, COUNT(*) AS cnt, MAX(created_at) AS last_at
    FROM phones
    WHERE length(phone) >= 8
    GROUP BY phone
  )
  SELECT COUNT(*)::integer INTO v_loyal_missing
  FROM stats
  WHERE cnt >= 3 AND last_at < now() - interval '20 days';

  v_result := jsonb_build_object(
    'recent_revenue', v_recent_rev,
    'prior_revenue', v_prior_rev,
    'revenue_delta_pct', v_delta,
    'idle_products', v_idle,
    'loyal_missing_count', v_loyal_missing
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.intel_smart_alerts(uuid) TO authenticated;


-- ============================================================
-- >>> 20260710064432_f95641a6-8725-493d-ade4-bbf08bc14ce3.sql
-- ============================================================
SELECT cron.schedule(
  'watchdog-pix-stuck',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://xrzudhylpphnzousilye.supabase.co/functions/v1/watchdog-pix-stuck',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyenVkaHlscHBobnpvdXNpbHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NTM1NzMsImV4cCI6MjA4NzAyOTU3M30.eEvmxp2aUsjdYAa-crOgB-NtdgPlfgfyT6fyyPA85Nc"}'::jsonb,
    body := '{"source":"cron"}'::jsonb
  );
  $$
);

-- ============================================================
-- >>> 20260713114023_825b9183-7592-487d-bc22-161c05aa8470.sql
-- ============================================================
CREATE OR REPLACE FUNCTION public.wa_enqueue_status(p_org_id uuid, p_order_id uuid, p_event text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org   organizations%ROWTYPE;
  v_order orders%ROWTYPE;
  v_phone text;
  v_name  text;
  v_total text;
  v_short text;
  v_template text;
  v_message  text;
  v_plan text;
  v_instance_ok boolean;
  v_recent boolean;
  v_items_sum numeric;
  v_frete_num numeric;
  v_frete_clean text;
  v_tipo text;
  v_tel_cli text;
  v_endereco text;
  v_frete text;
  v_pagamento text;
  v_obs text;
  v_agendado text;
  v_itens text;
  v_line text;
  v_out text;
  v_review_url text;
BEGIN
  SELECT * INTO v_org FROM organizations WHERE id = p_org_id;
  IF v_org.id IS NULL THEN RETURN; END IF;

  v_plan := public.get_effective_plan(v_org.id);
  IF v_plan NOT IN ('pro','enterprise','lifetime') THEN RETURN; END IF;

  SELECT EXISTS(
    SELECT 1 FROM whatsapp_instances
    WHERE organization_id = p_org_id AND status IN ('connected','open')
  ) INTO v_instance_ok;
  IF NOT v_instance_ok THEN
    INSERT INTO whatsapp_notification_log (order_id, event, status, error)
    VALUES (p_order_id, p_event, 'skipped', 'instância desconectada');
    RETURN;
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF v_order.id IS NULL THEN RETURN; END IF;

  IF p_event = 'new_order_owner' THEN
    v_phone := regexp_replace(COALESCE(v_org.whatsapp,''), '\D', '', 'g');
    IF char_length(v_phone) < 10 THEN RETURN; END IF;
    IF left(v_phone,2) <> '55' THEN v_phone := '55' || v_phone; END IF;
  ELSE
    v_phone := wa_extract_phone(v_order.notes);
    IF v_phone IS NULL THEN RETURN; END IF;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM whatsapp_outbox
    WHERE order_id = p_order_id AND event_type = p_event
      AND created_at > now() - interval '60 seconds'
  ) OR EXISTS(
    SELECT 1 FROM whatsapp_notification_log
    WHERE order_id = p_order_id AND event = p_event AND status = 'sent'
      AND created_at > now() - interval '60 seconds'
  ) INTO v_recent;
  IF v_recent THEN RETURN; END IF;

  v_name := wa_extract_name(v_order.notes);
  IF v_name IS NULL OR length(trim(v_name)) = 0 OR v_name ~ '^\d+$' THEN
    v_name := 'Cliente';
  END IF;

  SELECT COALESCE(SUM(price * quantity), 0) INTO v_items_sum
  FROM order_items WHERE order_id = v_order.id;

  -- GUARDA: se for evento de novo pedido e ainda não houver itens, aborta
  IF p_event IN ('new_order_customer','new_order_owner') AND COALESCE(v_items_sum,0) <= 0 THEN
    RETURN;
  END IF;

  -- Parse FRETE das notes (texto pra exibição + numérico pra somar no total)
  v_frete      := NULLIF(trim((regexp_match(COALESCE(v_order.notes,''), 'FRETE:([^|]+)'))[1]), '');
  v_frete_num  := 0;
  IF v_frete IS NOT NULL THEN
    IF lower(v_frete) IN ('grátis','gratis','free','0','r$ 0,00','r$0,00') THEN
      v_frete_num := 0;
    ELSE
      v_frete_clean := regexp_replace(v_frete, '[^0-9,\.]', '', 'g');
      v_frete_clean := replace(v_frete_clean, ',', '.');
      -- se houver mais de um ponto, mantém só o último
      IF (length(v_frete_clean) - length(replace(v_frete_clean, '.', ''))) > 1 THEN
        v_frete_clean := regexp_replace(v_frete_clean, '\.(?=.*\.)', '', 'g');
      END IF;
      BEGIN
        v_frete_num := COALESCE(v_frete_clean::numeric, 0);
      EXCEPTION WHEN OTHERS THEN
        v_frete_num := 0;
      END;
    END IF;
  END IF;

  v_total := replace(
    to_char(
      GREATEST(v_items_sum + COALESCE(v_frete_num, 0) - COALESCE(v_order.discount_value, 0), 0),
      'FM999G990D00'
    ),
    ',', '.'
  );

  v_short := COALESCE(v_order.order_number::text, upper(substr(v_order.id::text,1,6)));

  v_template := v_org.wa_auto_status->'templates'->>p_event;
  IF v_template IS NULL OR length(trim(v_template)) = 0 THEN
    v_template := CASE p_event
      WHEN 'new_order_customer' THEN
        'Olá, {nome}! 👋 Recebemos seu pedido #{numero} no valor de *R$ {total}*. Ele está aguardando a confirmação do estabelecimento! 📝 — {loja}'
      WHEN 'new_order_owner' THEN
        E'🛎️ *Novo Pedido — {loja}*\n📋 *#{numero}*\n\n👤 *Cliente:* {nome}\n📱 *Tel:* {telefone}\n📦 *Tipo:* {tipo}\n📍 *Endereço:* {endereco}\n🚚 *Frete:* {frete}\n🕐 *Agendado:* {agendado}\n\n🧾 *Itens:*\n{itens}\n\n💰 *Total:* R$ {total}\n💳 *Pagamento:* {pagamento}\n📝 *Obs:* {obs}\n\nAcesse o painel para aceitar.'
      WHEN 'preparing' THEN
        E'Seu pedido #{numero} foi aceito e já entrou em preparação na nossa cozinha! 🍳\n💰 Total: *R$ {total}* — {loja}'
      WHEN 'ready_pickup' THEN
        'Ótimas notícias, {nome}! Seu pedido #{numero} está pronto para retirada! 🎉 — {loja}'
      WHEN 'ready_delivery' THEN
        'Ótimas notícias, {nome}! Seu pedido #{numero} ficou pronto e está sendo embalado! 🎉 — {loja}'
      WHEN 'out_for_delivery' THEN
        'Seu pedido #{numero} já saiu com o motoboy e está a caminho! 🚀 — {loja}'
      WHEN 'delivered' THEN
        'Pedido #{numero} entregue! Bom apetite 🍽️ — {loja}'
      WHEN 'cancelled' THEN
        'Pedido #{numero} cancelado. Em caso de dúvida, fale com a gente. — {loja}'
      WHEN 'awaiting_payment' THEN
        'Pedido #{numero}: aguardando confirmação do pagamento PIX. Assim que cair, começamos a preparar. — {loja}'
      ELSE NULL
    END;
  END IF;
  IF v_template IS NULL THEN RETURN; END IF;

  v_tipo       := NULLIF(trim((regexp_match(COALESCE(v_order.notes,''), 'TIPO:([^|]+)'))[1]), '');
  v_tel_cli    := NULLIF(trim((regexp_match(COALESCE(v_order.notes,''), 'TEL:([^|]+)'))[1]), '');
  v_endereco   := NULLIF(trim((regexp_match(COALESCE(v_order.notes,''), 'END\.:([^|]+)'))[1]), '');
  v_pagamento  := NULLIF(trim((regexp_match(COALESCE(v_order.notes,''), 'PGTO:([^|]+)'))[1]), '');
  v_obs        := NULLIF(trim((regexp_match(COALESCE(v_order.notes,''), 'OBS:([^|]+)'))[1]), '');
  v_agendado   := NULLIF(trim((regexp_match(COALESCE(v_order.notes,''), 'AGENDADO:([^|]+)'))[1]), '');

  SELECT COALESCE(string_agg(
    '  • ' || quantity || 'x ' || name || ' — R$ ' ||
    replace(to_char(price * quantity, 'FM999G990D00'), ',', '.'),
    E'\n'
  ), '') INTO v_itens
  FROM order_items WHERE order_id = v_order.id;

  IF COALESCE(v_org.reviews_enabled, true) THEN
    v_review_url := 'https://trendfood.site/avaliar/' || COALESCE(v_org.slug,'') || '/' || v_order.id::text;
  ELSE
    v_review_url := '';
  END IF;

  v_message := v_template;
  v_message := replace(v_message, '{nome}',       v_name);
  v_message := replace(v_message, '{numero}',     v_short);
  v_message := replace(v_message, '{loja}',       COALESCE(v_org.name,''));
  v_message := replace(v_message, '{total}',      v_total);
  v_message := replace(v_message, '{telefone}',   COALESCE(v_tel_cli, ''));
  v_message := replace(v_message, '{tipo}',       COALESCE(v_tipo, ''));
  v_message := replace(v_message, '{endereco}',   COALESCE(v_endereco, ''));
  v_message := replace(v_message, '{frete}',      COALESCE(v_frete, ''));
  v_message := replace(v_message, '{pagamento}',  COALESCE(v_pagamento, ''));
  v_message := replace(v_message, '{obs}',        COALESCE(v_obs, ''));
  v_message := replace(v_message, '{agendado}',   COALESCE(v_agendado, ''));
  v_message := replace(v_message, '{itens}',      v_itens);
  v_message := replace(v_message, '{avaliacao_url}', v_review_url);

  v_out := '';
  FOREACH v_line IN ARRAY string_to_array(v_message, E'\n') LOOP
    IF v_line ~ ':\s*$' OR v_line ~ '\*\s*$' THEN
      CONTINUE;
    END IF;
    v_out := v_out || v_line || E'\n';
  END LOOP;
  v_message := rtrim(v_out, E'\n');

  INSERT INTO whatsapp_outbox (organization_id, order_id, event_type, phone, message, status)
  VALUES (p_org_id, p_order_id, p_event, v_phone, v_message, 'pending');
END;
$function$;

-- ============================================================
-- >>> 20260715042557_864cfad3-1f1d-4078-b9e6-1cab9c5b193a.sql
-- ============================================================
-- Reset Lanchonete RM: sessão UazAPI morreu, força re-pareamento QR
UPDATE public.whatsapp_instances
   SET status='disconnected', connected_at=NULL, phone_connected=NULL
 WHERE organization_id='6988dee2-483e-4b9d-aa71-50ac11a8c758';

-- Limpa mensagens presas na fila (evita retries inúteis contra sessão morta)
UPDATE public.whatsapp_outbox
   SET status='skipped',
       last_error=COALESCE(last_error,'') || ' [manual skip: session dead, awaiting QR re-pair]'
 WHERE organization_id='6988dee2-483e-4b9d-aa71-50ac11a8c758'
   AND status IN ('failed','pending','processing');
-- ============================================================
-- >>> 20260716121549_4d6f9e5c-7bbb-49a1-ba17-88ceffd31744.sql
-- ============================================================
ALTER TABLE public.ai_bot_config ADD COLUMN IF NOT EXISTS send_menu_link boolean NOT NULL DEFAULT true;
-- ============================================================
-- >>> 20260716124044_053ddbeb-206d-4636-ad05-9bc324b6eb56.sql
-- ============================================================
CREATE OR REPLACE FUNCTION public.wa_enqueue_status(p_org_id uuid, p_order_id uuid, p_event text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org   organizations%ROWTYPE;
  v_order orders%ROWTYPE;
  v_phone text;
  v_name  text;
  v_total text;
  v_short text;
  v_template text;
  v_message  text;
  v_plan text;
  v_instance_ok boolean;
  v_recent boolean;
  v_items_sum numeric;
  v_frete_num numeric;
  v_frete_clean text;
  v_tipo text;
  v_tel_cli text;
  v_endereco text;
  v_frete text;
  v_pagamento text;
  v_obs text;
  v_agendado text;
  v_itens text;
  v_line text;
  v_out text;
  v_review_url text;
BEGIN
  SELECT * INTO v_org FROM organizations WHERE id = p_org_id;
  IF v_org.id IS NULL THEN RETURN; END IF;

  v_plan := public.get_effective_plan(v_org.id);
  IF v_plan NOT IN ('pro','enterprise','lifetime') THEN RETURN; END IF;

  SELECT EXISTS(
    SELECT 1 FROM whatsapp_instances
    WHERE organization_id = p_org_id AND status IN ('connected','open')
  ) INTO v_instance_ok;
  IF NOT v_instance_ok THEN
    INSERT INTO whatsapp_notification_log (order_id, event, status, error)
    VALUES (p_order_id, p_event, 'skipped', 'instância desconectada');
    RETURN;
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF v_order.id IS NULL THEN RETURN; END IF;

  IF p_event = 'new_order_owner' THEN
    v_phone := regexp_replace(COALESCE(v_org.whatsapp,''), '\D', '', 'g');
    IF char_length(v_phone) < 10 THEN RETURN; END IF;
    IF left(v_phone,2) <> '55' THEN v_phone := '55' || v_phone; END IF;
  ELSE
    v_phone := wa_extract_phone(v_order.notes);
    IF v_phone IS NULL THEN RETURN; END IF;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM whatsapp_outbox
    WHERE order_id = p_order_id AND event_type = p_event
      AND created_at > now() - interval '60 seconds'
  ) OR EXISTS(
    SELECT 1 FROM whatsapp_notification_log
    WHERE order_id = p_order_id AND event = p_event AND status = 'sent'
      AND created_at > now() - interval '60 seconds'
  ) INTO v_recent;
  IF v_recent THEN RETURN; END IF;

  v_name := wa_extract_name(v_order.notes);
  IF v_name IS NULL OR length(trim(v_name)) = 0 OR v_name ~ '^\d+$' THEN
    v_name := 'Cliente';
  END IF;

  SELECT COALESCE(SUM(price * quantity), 0) INTO v_items_sum
  FROM order_items WHERE order_id = v_order.id;

  IF p_event IN ('new_order_customer','new_order_owner') AND COALESCE(v_items_sum,0) <= 0 THEN
    RETURN;
  END IF;

  v_frete      := NULLIF(trim((regexp_match(COALESCE(v_order.notes,''), 'FRETE:([^|]+)'))[1]), '');
  v_frete_num  := 0;
  IF v_frete IS NOT NULL THEN
    IF lower(v_frete) IN ('grátis','gratis','free','0','r$ 0,00','r$0,00') THEN
      v_frete_num := 0;
    ELSE
      v_frete_clean := regexp_replace(v_frete, '[^0-9,\.]', '', 'g');
      v_frete_clean := replace(v_frete_clean, ',', '.');
      IF (length(v_frete_clean) - length(replace(v_frete_clean, '.', ''))) > 1 THEN
        v_frete_clean := regexp_replace(v_frete_clean, '\.(?=.*\.)', '', 'g');
      END IF;
      BEGIN
        v_frete_num := COALESCE(v_frete_clean::numeric, 0);
      EXCEPTION WHEN OTHERS THEN
        v_frete_num := 0;
      END;
    END IF;
  END IF;

  v_total := replace(
    to_char(
      GREATEST(v_items_sum + COALESCE(v_frete_num, 0) - COALESCE(v_order.discount_value, 0), 0),
      'FM999G990D00'
    ),
    ',', '.'
  );

  v_short := COALESCE(v_order.order_number::text, upper(substr(v_order.id::text,1,6)));

  v_template := v_org.wa_auto_status->'templates'->>p_event;
  IF v_template IS NULL OR length(trim(v_template)) = 0 THEN
    v_template := CASE p_event
      WHEN 'new_order_customer' THEN
        'Olá, {nome}! 👋 Recebemos seu pedido #{numero} no valor de *R$ {total}*. Ele está aguardando a confirmação do estabelecimento! 📝 — {loja}'
      WHEN 'new_order_owner' THEN
        E'🛎️ *Novo Pedido — {loja}*\n📋 *#{numero}*\n\n👤 *Cliente:* {nome}\n📱 *Tel:* {telefone}\n📦 *Tipo:* {tipo}\n📍 *Endereço:* {endereco}\n🚚 *Frete:* {frete}\n🕐 *Agendado:* {agendado}\n\n🧾 *Itens:*\n{itens}\n\n💰 *Total:* R$ {total}\n💳 *Pagamento:* {pagamento}\n📝 *Obs:* {obs}\n\nAcesse o painel para aceitar.'
      WHEN 'preparing' THEN
        E'Seu pedido #{numero} foi aceito e já entrou em preparação na nossa cozinha! 🍳\n💰 Total: *R$ {total}* — {loja}'
      WHEN 'ready_pickup' THEN
        'Ótimas notícias, {nome}! Seu pedido #{numero} está pronto para retirada! 🎉 — {loja}'
      WHEN 'ready_delivery' THEN
        'Ótimas notícias, {nome}! Seu pedido #{numero} ficou pronto e está sendo embalado! 🎉 — {loja}'
      WHEN 'out_for_delivery' THEN
        'Seu pedido #{numero} já saiu com o motoboy e está a caminho! 🚀 — {loja}'
      WHEN 'delivered' THEN
        'Pedido #{numero} entregue! Bom apetite 🍽️ — {loja}'
      WHEN 'cancelled' THEN
        'Pedido #{numero} cancelado. Em caso de dúvida, fale com a gente. — {loja}'
      WHEN 'awaiting_payment' THEN
        'Pedido #{numero}: aguardando confirmação do pagamento PIX. Assim que cair, começamos a preparar. — {loja}'
      ELSE NULL
    END;
  END IF;
  IF v_template IS NULL THEN RETURN; END IF;

  v_tipo       := NULLIF(trim((regexp_match(COALESCE(v_order.notes,''), 'TIPO:([^|]+)'))[1]), '');
  v_tel_cli    := NULLIF(trim((regexp_match(COALESCE(v_order.notes,''), 'TEL:([^|]+)'))[1]), '');
  v_endereco   := NULLIF(trim((regexp_match(COALESCE(v_order.notes,''), 'END\.:([^|]+)'))[1]), '');
  v_pagamento  := NULLIF(trim((regexp_match(COALESCE(v_order.notes,''), 'PGTO:([^|]+)'))[1]), '');
  v_obs        := NULLIF(trim((regexp_match(COALESCE(v_order.notes,''), 'OBS:([^|]+)'))[1]), '');
  v_agendado   := NULLIF(trim((regexp_match(COALESCE(v_order.notes,''), 'AGENDADO:([^|]+)'))[1]), '');

  SELECT COALESCE(string_agg(
    '  • ' || quantity || 'x ' || name || ' — R$ ' ||
    replace(to_char(price * quantity, 'FM999G990D00'), ',', '.'),
    E'\n'
  ), '') INTO v_itens
  FROM order_items WHERE order_id = v_order.id;

  IF COALESCE(v_org.reviews_enabled, true) THEN
    v_review_url := 'https://trendfood.site/avaliar/' || COALESCE(v_org.slug,'') || '/' || v_order.id::text;
  ELSE
    v_review_url := '';
  END IF;

  v_message := v_template;
  v_message := replace(v_message, '{nome}',       v_name);
  v_message := replace(v_message, '{numero}',     v_short);
  v_message := replace(v_message, '{loja}',       COALESCE(v_org.name,''));
  v_message := replace(v_message, '{total}',      v_total);
  v_message := replace(v_message, '{telefone}',   COALESCE(v_tel_cli, ''));
  v_message := replace(v_message, '{tipo}',       COALESCE(v_tipo, ''));
  v_message := replace(v_message, '{endereco}',   COALESCE(v_endereco, ''));
  v_message := replace(v_message, '{frete}',      COALESCE(v_frete, ''));
  v_message := replace(v_message, '{pagamento}',  COALESCE(v_pagamento, ''));
  v_message := replace(v_message, '{obs}',        COALESCE(v_obs, ''));
  v_message := replace(v_message, '{agendado}',   COALESCE(v_agendado, ''));
  v_message := replace(v_message, '{itens}',      v_itens);
  v_message := replace(v_message, '{avaliacao_url}', v_review_url);

  -- Cleanup: só remove linhas de LABEL VAZIA (terminando em ":" ou ":*"),
  -- preservando headers como "🛎️ *Novo Pedido — Loja*" ou "📋 *#1234*".
  v_out := '';
  FOREACH v_line IN ARRAY string_to_array(v_message, E'\n') LOOP
    IF v_line ~ ':\*?\s*$' THEN
      CONTINUE;
    END IF;
    v_out := v_out || v_line || E'\n';
  END LOOP;
  v_message := rtrim(v_out, E'\n');

  INSERT INTO whatsapp_outbox (organization_id, order_id, event_type, phone, message, status)
  VALUES (p_org_id, p_order_id, p_event, v_phone, v_message, 'pending');
END;
$function$;
-- ============================================================
-- >>> 20260716134122_3c2b8b3a-9f5d-4e3b-932e-18bab893525f.sql
-- ============================================================

-- 1) Ajusta o trigger de auto-status: não enfileira new_order_* enquanto o pedido está awaiting_payment;
--    enfileira quando transiciona de awaiting_payment -> pending (confirmação do PIX automático).
CREATE OR REPLACE FUNCTION public.tg_orders_wa_auto_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tipo text;
  v_is_delivery boolean;
  v_event text;
BEGIN
  BEGIN
    IF TG_OP = 'INSERT' THEN
      -- Só enfileira mensagens de "novo pedido" se o pedido já nasce confirmado.
      -- Pedidos em awaiting_payment aguardam a confirmação do PIX para disparar.
      IF NEW.status <> 'awaiting_payment' THEN
        PERFORM wa_enqueue_status(NEW.organization_id, NEW.id, 'new_order_customer');
        PERFORM wa_enqueue_status(NEW.organization_id, NEW.id, 'new_order_owner');
      END IF;
      RETURN NEW;
    END IF;

    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
      RETURN NEW;
    END IF;

    -- Transição awaiting_payment -> pending (PIX confirmado): dispara novo pedido agora.
    IF OLD.status = 'awaiting_payment' AND NEW.status = 'pending' THEN
      PERFORM wa_enqueue_status(NEW.organization_id, NEW.id, 'new_order_customer');
      PERFORM wa_enqueue_status(NEW.organization_id, NEW.id, 'new_order_owner');
      RETURN NEW;
    END IF;

    v_tipo := wa_extract_tipo(NEW.notes);
    v_is_delivery := (v_tipo = 'Entrega');

    v_event := CASE NEW.status
      WHEN 'preparing'        THEN 'preparing'
      WHEN 'awaiting_payment' THEN 'awaiting_payment'
      WHEN 'ready'            THEN CASE WHEN v_is_delivery THEN 'ready_delivery' ELSE 'ready_pickup' END
      WHEN 'delivered'        THEN 'delivered'
      WHEN 'cancelled'        THEN 'cancelled'
      ELSE NULL
    END;

    IF v_event IS NOT NULL THEN
      PERFORM wa_enqueue_status(NEW.organization_id, NEW.id, v_event);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'tg_orders_wa_auto_status suprimido order=% op=% err=% state=%',
      COALESCE(NEW.id::text, 'nil'), TG_OP, SQLERRM, SQLSTATE;
  END;
  RETURN NEW;
END;
$function$;

-- 2) Agendamento do reconciliador de pedidos PIX (a cada 30 segundos).
--    Requer pg_cron e pg_net já habilitados no projeto.
DO $$
BEGIN
  -- Desagenda se já existir para evitar duplicidade
  PERFORM cron.unschedule('reconcile-pending-orders')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reconcile-pending-orders');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'reconcile-pending-orders',
  '30 seconds',
  $$
  SELECT net.http_post(
    url := 'https://xrzudhylpphnzousilye.supabase.co/functions/v1/reconcile-pending-orders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyenVkaHlscHBobnpvdXNpbHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NTM1NzMsImV4cCI6MjA4NzAyOTU3M30.eEvmxp2aUsjdYAa-crOgB-NtdgPlfgfyT6fyyPA85Nc'
    ),
    body := jsonb_build_object('cron', true)
  ) AS request_id;
  $$
);

-- ============================================================
-- >>> 20260717143800_e58c48b2-d665-4e0b-a437-bc8f0eaebd21.sql
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_infra_logs()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _net int; _cron int; _ifood int; _fila int; _err int;
  _tg int; _cl int; _tgauto int; _hb int; _wa int;
  _filawa int; _dedupe int; _aimetrics int;
BEGIN
  DELETE FROM net._http_response WHERE created < now() - interval '1 day';
  GET DIAGNOSTICS _net = ROW_COUNT;

  DELETE FROM cron.job_run_details WHERE start_time < now() - interval '3 days';
  GET DIAGNOSTICS _cron = ROW_COUNT;

  DELETE FROM public.ifood_event_log WHERE received_at < now() - interval '3 days';
  GET DIAGNOSTICS _ifood = ROW_COUNT;

  DELETE FROM public.fila_impressao WHERE status = 'impresso' AND created_at < now() - interval '2 days';
  GET DIAGNOSTICS _fila = ROW_COUNT;

  DELETE FROM public.client_error_logs WHERE created_at < now() - interval '14 days';
  GET DIAGNOSTICS _err = ROW_COUNT;

  DELETE FROM public.admin_telegram_log WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS _tg = ROW_COUNT;

  DELETE FROM public.cleanup_logs WHERE created_at < now() - interval '60 days';
  GET DIAGNOSTICS _cl = ROW_COUNT;

  DELETE FROM public.telegram_automations_log WHERE sent_at < now() - interval '30 days';
  GET DIAGNOSTICS _tgauto = ROW_COUNT;

  DELETE FROM public.store_version_heartbeat WHERE last_seen_at < now() - interval '7 days';
  GET DIAGNOSTICS _hb = ROW_COUNT;

  DELETE FROM public.whatsapp_outbox WHERE status IN ('sent','failed') AND created_at < now() - interval '7 days';
  GET DIAGNOSTICS _wa = ROW_COUNT;

  DELETE FROM public.fila_whatsapp WHERE created_at < now() - interval '7 days';
  GET DIAGNOSTICS _filawa = ROW_COUNT;

  DELETE FROM public.wa_message_dedupe WHERE created_at < now() - interval '1 day';
  GET DIAGNOSTICS _dedupe = ROW_COUNT;

  DELETE FROM public.ai_bot_metrics WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS _aimetrics = ROW_COUNT;

  INSERT INTO public.cron_health (job_name, last_success_at, last_run_count)
  VALUES ('cleanup_infra_logs', now(),
          _net + _cron + _ifood + _fila + _err + _tg + _cl + _tgauto + _hb + _wa + _filawa + _dedupe + _aimetrics)
  ON CONFLICT (job_name) DO UPDATE
    SET last_success_at = EXCLUDED.last_success_at,
        last_run_count  = EXCLUDED.last_run_count;

  RETURN jsonb_build_object(
    'net_http_response', _net,
    'cron_job_run_details', _cron,
    'ifood_event_log', _ifood,
    'fila_impressao', _fila,
    'client_error_logs', _err,
    'admin_telegram_log', _tg,
    'cleanup_logs', _cl,
    'telegram_automations_log', _tgauto,
    'store_version_heartbeat', _hb,
    'whatsapp_outbox', _wa,
    'fila_whatsapp', _filawa,
    'wa_message_dedupe', _dedupe,
    'ai_bot_metrics', _aimetrics
  );
END;
$function$;
-- ============================================================
-- >>> 20260717144605_84391922-ac5b-438e-b9a4-61d01f339f2e.sql
-- ============================================================
DO $$
DECLARE _kept int;
BEGIN
  CREATE TEMP TABLE _tmp_ifood ON COMMIT DROP AS
    SELECT * FROM public.ifood_event_log WHERE received_at > now() - interval '3 days';
  TRUNCATE public.ifood_event_log;
  INSERT INTO public.ifood_event_log SELECT * FROM _tmp_ifood;
  GET DIAGNOSTICS _kept = ROW_COUNT; RAISE NOTICE 'ifood_event_log kept: %', _kept;

  CREATE TEMP TABLE _tmp_filawa ON COMMIT DROP AS
    SELECT * FROM public.fila_whatsapp WHERE created_at > now() - interval '2 days';
  TRUNCATE public.fila_whatsapp;
  INSERT INTO public.fila_whatsapp SELECT * FROM _tmp_filawa;
  GET DIAGNOSTICS _kept = ROW_COUNT; RAISE NOTICE 'fila_whatsapp kept: %', _kept;

  CREATE TEMP TABLE _tmp_dedupe ON COMMIT DROP AS
    SELECT * FROM public.wa_message_dedupe WHERE created_at > now() - interval '1 day';
  TRUNCATE public.wa_message_dedupe;
  INSERT INTO public.wa_message_dedupe SELECT * FROM _tmp_dedupe;
  GET DIAGNOSTICS _kept = ROW_COUNT; RAISE NOTICE 'wa_message_dedupe kept: %', _kept;

  CREATE TEMP TABLE _tmp_err ON COMMIT DROP AS
    SELECT * FROM public.client_error_logs WHERE created_at > now() - interval '7 days';
  TRUNCATE public.client_error_logs;
  INSERT INTO public.client_error_logs SELECT * FROM _tmp_err;
  GET DIAGNOSTICS _kept = ROW_COUNT; RAISE NOTICE 'client_error_logs kept: %', _kept;

  CREATE TEMP TABLE _tmp_fila ON COMMIT DROP AS
    SELECT * FROM public.fila_impressao
    WHERE status <> 'impresso' OR created_at > now() - interval '1 day';
  TRUNCATE public.fila_impressao;
  INSERT INTO public.fila_impressao SELECT * FROM _tmp_fila;
  GET DIAGNOSTICS _kept = ROW_COUNT; RAISE NOTICE 'fila_impressao kept: %', _kept;
END $$;