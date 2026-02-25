
-- 1. Tabela platform_plans
CREATE TABLE public.platform_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  description text,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  highlighted boolean NOT NULL DEFAULT false,
  badge text,
  checkout_url text,
  webhook_secret_name text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.platform_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_plans_select_public"
  ON public.platform_plans FOR SELECT
  USING (true);

CREATE POLICY "platform_plans_insert_admin"
  ON public.platform_plans FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "platform_plans_update_admin"
  ON public.platform_plans FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "platform_plans_delete_admin"
  ON public.platform_plans FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Coluna default_trial_days em platform_config
ALTER TABLE public.platform_config
  ADD COLUMN default_trial_days integer NOT NULL DEFAULT 7;

-- 3. Function para calcular trial_ends_at dinamicamente
CREATE OR REPLACE FUNCTION public.calc_trial_ends_at()
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT now() + (COALESCE(
    (SELECT default_trial_days FROM platform_config LIMIT 1),
    7
  ) || ' days')::interval;
$$;

-- 4. Alterar o default de organizations.trial_ends_at
ALTER TABLE public.organizations
  ALTER COLUMN trial_ends_at SET DEFAULT public.calc_trial_ends_at();

-- 5. Seed dos 3 planos atuais
INSERT INTO public.platform_plans (key, name, price_cents, description, features, highlighted, badge, checkout_url, webhook_secret_name, sort_order, active) VALUES
(
  'free', 'Grátis', 0,
  'Ideal para começar e testar a plataforma',
  '["Catálogo digital","Até 20 itens no cardápio","1 ponto de atendimento (QR Code)","Pedidos por QR Code","Link compartilhável do catálogo"]'::jsonb,
  false, NULL, NULL, NULL, 0, true
),
(
  'pro', 'Pro', 9900,
  'Para negócios que querem crescer com controle total',
  '["Tudo do plano Grátis","Itens ilimitados no cardápio","Pontos de atendimento ilimitados","Painel de Produção (KDS)","Controle de Caixa completo","Cupons de desconto","Ranking de mais vendidos","Impressora térmica 80mm","Painel do Atendente"]'::jsonb,
  true, 'Recomendado', 'https://pay.cakto.com.br/ad3b2o7_776555', 'CAKTO_WEBHOOK_SECRET_PRO', 1, true
),
(
  'enterprise', 'Enterprise', 24900,
  'Para redes e operações de alta demanda',
  '["Tudo do plano Pro","Múltiplas unidades","Relatórios avançados","Suporte prioritário","Integração com delivery (em breve)","Gerente de conta dedicado"]'::jsonb,
  false, NULL, 'https://pay.cakto.com.br/39s38ju_776565', 'CAKTO_WEBHOOK_SECRET_ENTERPRISE', 2, true
);
