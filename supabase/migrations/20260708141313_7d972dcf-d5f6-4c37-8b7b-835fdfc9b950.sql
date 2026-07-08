
-- 1. Coluna nova em organizations (default false = zero impacto em outras lojas)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS requires_ai_bot_addon boolean NOT NULL DEFAULT false;

-- 2. Tabela org_addons
CREATE TABLE IF NOT EXISTS public.org_addons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  addon_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','past_due','cancelled')),
  price_monthly numeric(10,2) NOT NULL,
  billing_day smallint NOT NULL DEFAULT 4 CHECK (billing_day BETWEEN 1 AND 28),
  current_period_end timestamptz,
  mp_preapproval_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, addon_key)
);

CREATE INDEX IF NOT EXISTS idx_org_addons_org ON public.org_addons(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_addons_preapproval ON public.org_addons(mp_preapproval_id);

-- 3. GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_addons TO authenticated;
GRANT ALL ON public.org_addons TO service_role;

-- 4. RLS
ALTER TABLE public.org_addons ENABLE ROW LEVEL SECURITY;

-- Dono da org lê seus próprios addons
CREATE POLICY "Org owner reads own addons"
  ON public.org_addons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = org_addons.organization_id
        AND o.user_id = auth.uid()
    )
  );

-- Admin da plataforma lê tudo
CREATE POLICY "Platform admin reads all addons"
  ON public.org_addons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND u.email = 'brenojackson30@gmail.com'
    )
  );

-- Admin da plataforma pode gerenciar tudo
CREATE POLICY "Platform admin manages addons"
  ON public.org_addons FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND u.email = 'brenojackson30@gmail.com'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND u.email = 'brenojackson30@gmail.com'
    )
  );

-- 5. Trigger updated_at
CREATE OR REPLACE FUNCTION public.org_addons_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_addons_touch ON public.org_addons;
CREATE TRIGGER trg_org_addons_touch
  BEFORE UPDATE ON public.org_addons
  FOR EACH ROW EXECUTE FUNCTION public.org_addons_touch_updated_at();

-- 6. Ativa flag SOMENTE na org Rei do Burguer
UPDATE public.organizations
SET requires_ai_bot_addon = true
WHERE id = '7d99c44e-661d-4918-b7a9-5385e9fd35ab';

-- 7. Registra que ele já pagou este mês, próxima cobrança 04/08/2026
INSERT INTO public.org_addons (organization_id, addon_key, status, price_monthly, billing_day, current_period_end)
VALUES ('7d99c44e-661d-4918-b7a9-5385e9fd35ab', 'ai_bot', 'active', 50.00, 4, '2026-08-04 03:00:00+00')
ON CONFLICT (organization_id, addon_key) DO NOTHING;
