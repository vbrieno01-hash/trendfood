
-- 1) Novas colunas em orders para iFood
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ifood_patched_at timestamptz,
  ADD COLUMN IF NOT EXISTS ifood_driver_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS ifood_driver_name text,
  ADD COLUMN IF NOT EXISTS ifood_scheduled_for timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_ifood_scheduled
  ON public.orders (organization_id, ifood_scheduled_for)
  WHERE ifood_scheduled_for IS NOT NULL;

-- 2) Tabela de disputas (HANDSHAKE)
CREATE TABLE IF NOT EXISTS public.ifood_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  dispute_id text NOT NULL,
  ifood_order_id text,
  order_id uuid,
  dispute_type text,
  expires_at timestamptz,
  payload jsonb,
  status text NOT NULL DEFAULT 'open',
  responded_at timestamptz,
  response_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ifood_disputes_dispute_id_unique UNIQUE (dispute_id),
  CONSTRAINT ifood_disputes_status_check CHECK (status IN ('open','accepted','rejected','alternative_offered','expired','auto_resolved'))
);

CREATE INDEX IF NOT EXISTS idx_ifood_disputes_org_status
  ON public.ifood_disputes (organization_id, status, expires_at);

ALTER TABLE public.ifood_disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ifood_disputes_select_owner ON public.ifood_disputes;
CREATE POLICY ifood_disputes_select_owner ON public.ifood_disputes
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM organizations WHERE id = ifood_disputes.organization_id)
  );

DROP POLICY IF EXISTS ifood_disputes_select_admin ON public.ifood_disputes;
CREATE POLICY ifood_disputes_select_admin ON public.ifood_disputes
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS ifood_disputes_insert_service ON public.ifood_disputes;
CREATE POLICY ifood_disputes_insert_service ON public.ifood_disputes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS ifood_disputes_update_owner ON public.ifood_disputes;
CREATE POLICY ifood_disputes_update_owner ON public.ifood_disputes
  FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM organizations WHERE id = ifood_disputes.organization_id)
  );

DROP POLICY IF EXISTS ifood_disputes_update_admin ON public.ifood_disputes;
CREATE POLICY ifood_disputes_update_admin ON public.ifood_disputes
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS ifood_disputes_update_service ON public.ifood_disputes;
CREATE POLICY ifood_disputes_update_service ON public.ifood_disputes
  FOR UPDATE USING (true);

-- 3) Realtime para ifood_disputes
ALTER PUBLICATION supabase_realtime ADD TABLE public.ifood_disputes;

-- 4) Trigger updated_at
CREATE OR REPLACE FUNCTION public.tg_ifood_disputes_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_ifood_disputes_touch ON public.ifood_disputes;
CREATE TRIGGER tg_ifood_disputes_touch
  BEFORE UPDATE ON public.ifood_disputes
  FOR EACH ROW EXECUTE FUNCTION public.tg_ifood_disputes_touch();

-- 5) pg_cron para expirar disputes
DO $$
BEGIN
  PERFORM cron.unschedule('ifood-disputes-expire');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'ifood-disputes-expire',
  '*/5 * * * *',
  $$ UPDATE public.ifood_disputes
     SET status = 'expired'
     WHERE status = 'open' AND expires_at IS NOT NULL AND expires_at < now(); $$
);
