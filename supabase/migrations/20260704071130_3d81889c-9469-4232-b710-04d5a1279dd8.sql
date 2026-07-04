
CREATE OR REPLACE FUNCTION public.tg_orders_auto_emit_nfce()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cfg RECORD;
  v_url TEXT;
  v_anon TEXT;
BEGIN
  IF NEW.status NOT IN ('delivered','completed','entregue','concluido','concluído') THEN
    RETURN NEW;
  END IF;
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  SELECT * INTO v_cfg FROM public.fiscal_config
   WHERE organization_id = NEW.organization_id AND enabled = true AND mode = 'auto';
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.fiscal_invoices WHERE order_id = NEW.id) THEN
    RETURN NEW;
  END IF;
  SELECT value INTO v_url  FROM public.platform_config WHERE key = 'supabase_functions_url';
  SELECT value INTO v_anon FROM public.platform_config WHERE key = 'supabase_anon_key';
  IF v_url IS NULL OR v_anon IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM net.http_post(
    url := v_url || '/fiscal-auto-emit-trigger',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon),
    body := jsonb_build_object('order_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END; $$;
