
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
