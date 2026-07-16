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