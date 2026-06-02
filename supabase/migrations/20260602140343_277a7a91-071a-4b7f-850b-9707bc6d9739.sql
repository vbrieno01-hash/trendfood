
-- Corrigir tabela V8 de comissões de afiliados conforme PDF oficial
DELETE FROM public.affiliate_commission_tiers;

INSERT INTO public.affiliate_commission_tiers (plan_key, cycle, label, upfront_pct, installment_pct, sort_order, active) VALUES
  ('pro',        'monthly',   'Pro Mensal R$ 99',           30, 25, 1, true),
  ('pro',        'quarterly', 'Pro Trimestral R$ 267',      20, 15, 2, true),
  ('pro',        'annual',    'Pro Anual R$ 990',           15, 10, 3, true),
  ('enterprise', 'monthly',   'Enterprise Mensal R$ 249',   25, 12, 4, true),
  ('enterprise', 'quarterly', 'Enterprise Trimestral R$ 672', 15, 12, 5, true),
  ('enterprise', 'annual',    'Enterprise Anual R$ 2.490',  10, 12, 6, true);
