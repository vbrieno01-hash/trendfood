
-- ===================================================================
-- MÓDULO 4: Status automático no WhatsApp
-- ===================================================================

-- 1) Coluna em organizations: configuração do auto-status
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS wa_auto_status jsonb NOT NULL DEFAULT jsonb_build_object(
    'enabled', false,
    'templates', jsonb_build_object(
      'pending',          'Olá {nome}! 👋 Recebemos seu pedido #{numero} no valor de R$ {total}. Em instantes confirmamos. — {loja}',
      'preparing',        'Pedido #{numero} aceito! 🍳 Já estamos preparando. — {loja}',
      'awaiting_payment', 'Pedido #{numero}: aguardando confirmação do pagamento PIX. Assim que cair, começamos a preparar. — {loja}',
      'ready_pickup',     'Pedido #{numero} pronto! 🎉 Pode vir retirar quando quiser. — {loja}',
      'ready_delivery',   'Pedido #{numero} saiu pra entrega! 🛵 Chega em alguns minutos. — {loja}',
      'delivered',        'Pedido #{numero} entregue! Bom apetite 🍽️ Avalia a gente: {avaliacao_url} — {loja}',
      'cancelled',        'Pedido #{numero} cancelado. Em caso de dúvida, fale com a gente. — {loja}'
    )
  );

-- 2) Tabela outbox de mensagens automáticas
CREATE TABLE IF NOT EXISTS public.whatsapp_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  order_id uuid,
  phone text NOT NULL,
  message text NOT NULL,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | sent | failed | skipped
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_wa_outbox_status_created
  ON public.whatsapp_outbox (status, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_wa_outbox_org ON public.whatsapp_outbox (organization_id, created_at DESC);

ALTER TABLE public.whatsapp_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wa_outbox_select_owner ON public.whatsapp_outbox;
CREATE POLICY wa_outbox_select_owner ON public.whatsapp_outbox
  FOR SELECT TO public
  USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = whatsapp_outbox.organization_id));

DROP POLICY IF EXISTS wa_outbox_select_admin ON public.whatsapp_outbox;
CREATE POLICY wa_outbox_select_admin ON public.whatsapp_outbox
  FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS wa_outbox_delete_owner ON public.whatsapp_outbox;
CREATE POLICY wa_outbox_delete_owner ON public.whatsapp_outbox
  FOR DELETE TO public
  USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = whatsapp_outbox.organization_id));

DROP POLICY IF EXISTS wa_outbox_service_all ON public.whatsapp_outbox;
CREATE POLICY wa_outbox_service_all ON public.whatsapp_outbox
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3) Função utilitária: extrai telefone das notes (formato TEL:xxxx)
CREATE OR REPLACE FUNCTION public.wa_extract_phone(p_notes text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE v text; digits text;
BEGIN
  IF p_notes IS NULL THEN RETURN NULL; END IF;
  v := substring(p_notes from 'TEL:([^|]+)');
  IF v IS NULL THEN RETURN NULL; END IF;
  digits := regexp_replace(v, '\D', '', 'g');
  IF char_length(digits) < 10 THEN RETURN NULL; END IF;
  IF char_length(digits) >= 10 AND left(digits,2) <> '55' THEN
    digits := '55' || digits;
  END IF;
  RETURN digits;
END;
$$;

CREATE OR REPLACE FUNCTION public.wa_extract_name(p_notes text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(trim(substring(p_notes from 'CLIENTE:([^|]+)')), ''), 'cliente');
$$;

CREATE OR REPLACE FUNCTION public.wa_extract_tipo(p_notes text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT trim(substring(p_notes from 'TIPO:([^|]+)'));
$$;

-- 4) Função que renderiza o template e enfileira
CREATE OR REPLACE FUNCTION public.wa_enqueue_status(
  p_org_id uuid,
  p_order_id uuid,
  p_event text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org organizations%ROWTYPE;
  v_order orders%ROWTYPE;
  v_phone text;
  v_name text;
  v_tipo text;
  v_template text;
  v_message text;
  v_total text;
  v_review_url text;
BEGIN
  SELECT * INTO v_org FROM organizations WHERE id = p_org_id;
  IF v_org.id IS NULL THEN RETURN; END IF;
  IF NOT COALESCE((v_org.wa_auto_status->>'enabled')::boolean, false) THEN RETURN; END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF v_order.id IS NULL THEN RETURN; END IF;

  v_phone := wa_extract_phone(v_order.notes);
  IF v_phone IS NULL THEN RETURN; END IF;

  v_name := wa_extract_name(v_order.notes);
  v_tipo := wa_extract_tipo(v_order.notes);

  v_template := v_org.wa_auto_status->'templates'->>p_event;
  IF v_template IS NULL OR length(trim(v_template)) = 0 THEN RETURN; END IF;

  v_total := to_char(COALESCE(v_order.total, 0), 'FM999G990D00');
  v_review_url := 'https://trendfood.lovable.app/avaliar/' || v_order.id::text;

  v_message := replace(v_template, '{nome}', v_name);
  v_message := replace(v_message, '{numero}', COALESCE(v_order.order_number::text, substr(v_order.id::text, 1, 6)));
  v_message := replace(v_message, '{loja}', v_org.name);
  v_message := replace(v_message, '{total}', v_total);
  v_message := replace(v_message, '{avaliacao_url}', v_review_url);

  INSERT INTO whatsapp_outbox (organization_id, order_id, phone, message, event_type)
  VALUES (p_org_id, p_order_id, v_phone, v_message, p_event);
END;
$$;

-- 5) Trigger no orders: enfileira em mudanças de status relevantes
CREATE OR REPLACE FUNCTION public.tg_orders_wa_auto_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event text;
  v_tipo text;
  v_is_delivery boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Pedido recém-criado → confirmação inicial
    IF NEW.status IN ('pending','preparing') THEN
      PERFORM wa_enqueue_status(NEW.organization_id, NEW.id, 'pending');
    ELSIF NEW.status = 'awaiting_payment' THEN
      PERFORM wa_enqueue_status(NEW.organization_id, NEW.id, 'awaiting_payment');
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: só dispara quando muda o status
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_wa_auto_status ON public.orders;
CREATE TRIGGER trg_orders_wa_auto_status
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_orders_wa_auto_status();
