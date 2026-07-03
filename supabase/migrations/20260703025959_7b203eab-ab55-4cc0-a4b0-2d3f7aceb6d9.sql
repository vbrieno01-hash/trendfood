
CREATE OR REPLACE FUNCTION public.wa_enqueue_status(
  p_org_id uuid, p_order_id uuid, p_event text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  SELECT * INTO v_org FROM organizations WHERE id = p_org_id;
  IF v_org.id IS NULL THEN RETURN; END IF;

  IF NOT COALESCE(v_org.whatsapp_bot_allowed, false) THEN RETURN; END IF;

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

  v_name  := wa_extract_name(v_order.notes);

  -- Total: soma dos itens - desconto (coluna orders.total_price nao existe mais)
  SELECT COALESCE(SUM(price * quantity), 0) INTO v_items_sum
  FROM order_items WHERE order_id = v_order.id;
  v_total := replace(
    to_char(GREATEST(v_items_sum - COALESCE(v_order.discount_value, 0), 0), 'FM999G990D00'),
    ',', '.'
  );

  v_short := COALESCE(v_order.order_number::text, upper(substr(v_order.id::text,1,6)));

  v_template := v_org.wa_auto_status->'templates'->>p_event;
  IF v_template IS NULL OR length(trim(v_template)) = 0 THEN
    v_template := CASE p_event
      WHEN 'new_order_customer' THEN
        'Olá, {nome}! Recebemos o seu pedido #{numero}. Ele está aguardando a confirmação do estabelecimento! 📝 — {loja}'
      WHEN 'new_order_owner' THEN
        '🚨 NOVO PEDIDO RECEBIDO! O pedido #{numero} acabou de ser realizado por {nome} no valor de R$ {total}. Acesse o painel para aceitar!'
      WHEN 'preparing' THEN
        'Seu pedido #{numero} foi aceito e já entrou em preparação na nossa cozinha! 🍳 — {loja}'
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

  v_message := replace(v_template, '{nome}', v_name);
  v_message := replace(v_message, '{numero}', v_short);
  v_message := replace(v_message, '{loja}', COALESCE(v_org.name,''));
  v_message := replace(v_message, '{total}', v_total);
  v_message := replace(v_message, '{avaliacao_url}', 'https://trendfood.site/avaliar/' || v_order.id::text);

  INSERT INTO whatsapp_outbox (organization_id, order_id, phone, message, event_type)
  VALUES (p_org_id, p_order_id, v_phone, v_message, p_event);
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_orders_wa_auto_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo text;
  v_is_delivery boolean;
  v_event text;
BEGIN
  BEGIN
    IF TG_OP = 'INSERT' THEN
      PERFORM wa_enqueue_status(NEW.organization_id, NEW.id, 'new_order_customer');
      PERFORM wa_enqueue_status(NEW.organization_id, NEW.id, 'new_order_owner');
      RETURN NEW;
    END IF;

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
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'tg_orders_wa_auto_status suprimido order=% op=% err=% state=%',
      COALESCE(NEW.id::text, 'nil'), TG_OP, SQLERRM, SQLSTATE;
  END;
  RETURN NEW;
END;
$$;
