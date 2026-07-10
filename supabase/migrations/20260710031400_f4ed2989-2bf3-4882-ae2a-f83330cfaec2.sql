-- ============================================================
-- ONDA 1: Estrutura de banco pro Add-on "Campanhas WhatsApp"
-- ============================================================

-- 1) TABELA: campaign_credits (saldo mensal por loja)
CREATE TABLE public.campaign_credits (
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
CREATE INDEX idx_campaign_credits_org ON public.campaign_credits(organization_id);
CREATE INDEX idx_campaign_credits_status ON public.campaign_credits(status) WHERE status = 'active';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_credits TO authenticated;
GRANT ALL ON public.campaign_credits TO service_role;

ALTER TABLE public.campaign_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaign_credits_select_owner" ON public.campaign_credits FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = campaign_credits.organization_id));
CREATE POLICY "campaign_credits_select_admin" ON public.campaign_credits FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "campaign_credits_insert_owner" ON public.campaign_credits FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = campaign_credits.organization_id));
CREATE POLICY "campaign_credits_update_owner" ON public.campaign_credits FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = campaign_credits.organization_id));
CREATE POLICY "campaign_credits_update_admin" ON public.campaign_credits FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "campaign_credits_delete_admin" ON public.campaign_credits FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) TABELA: campaigns (campanhas criadas)
CREATE TABLE public.campaigns (
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
CREATE INDEX idx_campaigns_org_created ON public.campaigns(organization_id, created_at DESC);
CREATE INDEX idx_campaigns_status ON public.campaigns(status) WHERE status IN ('draft','sending');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_select_owner" ON public.campaigns FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = campaigns.organization_id));
CREATE POLICY "campaigns_select_admin" ON public.campaigns FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "campaigns_insert_owner" ON public.campaigns FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = campaigns.organization_id));
CREATE POLICY "campaigns_update_owner" ON public.campaigns FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = campaigns.organization_id));
CREATE POLICY "campaigns_delete_owner" ON public.campaigns FOR DELETE
  USING (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = campaigns.organization_id));

-- 3) TABELA: campaign_recipients (telefones de cada campanha)
CREATE TABLE public.campaign_recipients (
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
CREATE INDEX idx_campaign_recipients_campaign ON public.campaign_recipients(campaign_id, status);
CREATE INDEX idx_campaign_recipients_org ON public.campaign_recipients(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_recipients TO authenticated;
GRANT ALL ON public.campaign_recipients TO service_role;

ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaign_recipients_select_owner" ON public.campaign_recipients FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = campaign_recipients.organization_id));
CREATE POLICY "campaign_recipients_select_admin" ON public.campaign_recipients FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "campaign_recipients_insert_owner" ON public.campaign_recipients FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = campaign_recipients.organization_id));
CREATE POLICY "campaign_recipients_update_owner" ON public.campaign_recipients FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = campaign_recipients.organization_id));
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

CREATE TRIGGER trg_campaign_credits_updated
  BEFORE UPDATE ON public.campaign_credits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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
