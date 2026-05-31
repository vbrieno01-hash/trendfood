
-- ============================================================
-- AFILIADOS V8: modelo por META (sem recorrência infinita)
-- ============================================================

-- 1) Tabela de tiers (% por plano/ciclo, editável no admin)
CREATE TABLE public.affiliate_commission_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text NOT NULL,
  cycle text NOT NULL,
  label text NOT NULL,
  upfront_pct numeric NOT NULL,
  installment_pct numeric NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_key, cycle)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_commission_tiers TO authenticated;
GRANT ALL ON public.affiliate_commission_tiers TO service_role;

ALTER TABLE public.affiliate_commission_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage tiers"
  ON public.affiliate_commission_tiers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_tiers_updated_at
  BEFORE UPDATE ON public.affiliate_commission_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed v8
INSERT INTO public.affiliate_commission_tiers (plan_key, cycle, label, upfront_pct, installment_pct, sort_order) VALUES
  ('pro',        'monthly',   'Mensal R$ 79',       30, 25, 1),
  ('pro',        'quarterly', 'Trimestral R$ 199',  20, 15, 2),
  ('pro',        'annual',    'Anual R$ 599',       15, 10, 3),
  ('lifetime',   'lifetime',  'Vitalício R$ 999',   25, 12, 4),
  ('addon',      'monthly',   'Add-on mensal',      15, 12, 5),
  ('addon',      'onetime',   'Add-on único',       10, 12, 6);

-- 2) Enums de meta
CREATE TYPE affiliate_goal_mode AS ENUM ('pending_choice','upfront','installments_3x');
CREATE TYPE affiliate_goal_status AS ENUM ('awaiting_choice','active','completed','refunded','cancelled');

-- 3) Goals (cada cliente = 1 meta com começo e fim)
CREATE TABLE public.affiliate_client_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  client_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_payment_id text,
  plan_key text NOT NULL,
  cycle text NOT NULL,
  client_amount_cents integer NOT NULL,
  tier_upfront_pct numeric NOT NULL,
  tier_installment_pct numeric NOT NULL,
  mode affiliate_goal_mode NOT NULL DEFAULT 'pending_choice',
  total_commission_cents integer NOT NULL DEFAULT 0,
  installments_total integer NOT NULL DEFAULT 1,
  installments_paid integer NOT NULL DEFAULT 0,
  next_release_at timestamptz,
  status affiliate_goal_status NOT NULL DEFAULT 'awaiting_choice',
  choice_deadline_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  client_paid_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  telegram_message_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_payment_id, affiliate_id)
);

CREATE INDEX idx_aff_goals_affiliate ON public.affiliate_client_goals(affiliate_id);
CREATE INDEX idx_aff_goals_status ON public.affiliate_client_goals(status);
CREATE INDEX idx_aff_goals_deadline ON public.affiliate_client_goals(choice_deadline_at)
  WHERE status = 'awaiting_choice';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_client_goals TO authenticated;
GRANT ALL ON public.affiliate_client_goals TO service_role;

ALTER TABLE public.affiliate_client_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage goals"
  ON public.affiliate_client_goals FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_goals_updated_at
  BEFORE UPDATE ON public.affiliate_client_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Estender affiliate_commissions: liga à meta + batch
ALTER TABLE public.affiliate_commissions
  ADD COLUMN goal_id uuid REFERENCES public.affiliate_client_goals(id) ON DELETE CASCADE,
  ADD COLUMN installment_index integer NOT NULL DEFAULT 1,
  ADD COLUMN paid_in_batch_id uuid;

CREATE INDEX idx_aff_comm_goal ON public.affiliate_commissions(goal_id);
CREATE INDEX idx_aff_comm_batch ON public.affiliate_commissions(paid_in_batch_id);

-- 5) Batches de pagamento dia 5
CREATE TABLE public.affiliate_payout_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_month text NOT NULL,
  paid_at timestamptz,
  total_cents integer NOT NULL DEFAULT 0,
  affiliate_count integer NOT NULL DEFAULT 0,
  commission_count integer NOT NULL DEFAULT 0,
  csv_data text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(period_month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_payout_batches TO authenticated;
GRANT ALL ON public.affiliate_payout_batches TO service_role;

ALTER TABLE public.affiliate_payout_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payout batches"
  ON public.affiliate_payout_batches FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_batches_updated_at
  BEFORE UPDATE ON public.affiliate_payout_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Cron: dia 5 às 12:00 UTC (09:00 BRT) → roda payout batch
SELECT cron.schedule(
  'affiliate-monthly-payout-day5',
  '0 12 5 * *',
  $$
  SELECT net.http_post(
    url := 'https://xrzudhylpphnzousilye.supabase.co/functions/v1/affiliate-monthly-payout',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 7) Cron: a cada hora → força upfront se passou de 48h sem escolha
SELECT cron.schedule(
  'affiliate-auto-choose-hourly',
  '23 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://xrzudhylpphnzousilye.supabase.co/functions/v1/affiliate-auto-choose',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
