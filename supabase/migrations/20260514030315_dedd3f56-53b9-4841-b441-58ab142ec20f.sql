CREATE OR REPLACE FUNCTION public.wa_enqueue_status(p_org_id uuid, p_order_id uuid, p_event text)
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
  v_total_num numeric;
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

  -- Calcula o total a partir de order_items (orders não tem coluna total)
  SELECT COALESCE(SUM(price * quantity), 0) INTO v_total_num
    FROM order_items WHERE order_id = v_order.id;

  v_total := to_char(COALESCE(v_total_num, 0), 'FM999G990D00');
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