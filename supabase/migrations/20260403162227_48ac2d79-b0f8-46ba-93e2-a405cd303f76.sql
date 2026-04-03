
-- loyalty_config: per-store loyalty program settings
CREATE TABLE public.loyalty_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  spend_per_point numeric NOT NULL DEFAULT 50,
  points_to_redeem integer NOT NULL DEFAULT 10,
  reward_type text NOT NULL DEFAULT 'fixed',
  reward_value numeric NOT NULL DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_config_select_public" ON public.loyalty_config FOR SELECT USING (true);
CREATE POLICY "loyalty_config_insert_owner" ON public.loyalty_config FOR INSERT WITH CHECK (
  auth.uid() = (SELECT user_id FROM organizations WHERE id = loyalty_config.organization_id)
);
CREATE POLICY "loyalty_config_update_owner" ON public.loyalty_config FOR UPDATE USING (
  auth.uid() = (SELECT user_id FROM organizations WHERE id = loyalty_config.organization_id)
);
CREATE POLICY "loyalty_config_delete_owner" ON public.loyalty_config FOR DELETE USING (
  auth.uid() = (SELECT user_id FROM organizations WHERE id = loyalty_config.organization_id)
);
CREATE POLICY "loyalty_config_insert_admin" ON public.loyalty_config FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "loyalty_config_update_admin" ON public.loyalty_config FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "loyalty_config_delete_admin" ON public.loyalty_config FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- loyalty_points: customer balance per phone per org
CREATE TABLE public.loyalty_points (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  phone text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  total_spent numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, phone)
);

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_points_select_public" ON public.loyalty_points FOR SELECT USING (true);
CREATE POLICY "loyalty_points_insert_public" ON public.loyalty_points FOR INSERT WITH CHECK (true);
CREATE POLICY "loyalty_points_update_public" ON public.loyalty_points FOR UPDATE USING (true);
CREATE POLICY "loyalty_points_delete_owner" ON public.loyalty_points FOR DELETE USING (
  auth.uid() = (SELECT user_id FROM organizations WHERE id = loyalty_points.organization_id)
);
CREATE POLICY "loyalty_points_delete_admin" ON public.loyalty_points FOR DELETE USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_loyalty_points_updated_at
  BEFORE UPDATE ON public.loyalty_points
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- loyalty_redemptions: redemption history
CREATE TABLE public.loyalty_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  phone text NOT NULL,
  points_used integer NOT NULL,
  discount_value numeric NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_redemptions_select_owner" ON public.loyalty_redemptions FOR SELECT USING (
  auth.uid() = (SELECT user_id FROM organizations WHERE id = loyalty_redemptions.organization_id)
);
CREATE POLICY "loyalty_redemptions_select_admin" ON public.loyalty_redemptions FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "loyalty_redemptions_insert_public" ON public.loyalty_redemptions FOR INSERT WITH CHECK (true);
CREATE POLICY "loyalty_redemptions_delete_owner" ON public.loyalty_redemptions FOR DELETE USING (
  auth.uid() = (SELECT user_id FROM organizations WHERE id = loyalty_redemptions.organization_id)
);
CREATE POLICY "loyalty_redemptions_delete_admin" ON public.loyalty_redemptions FOR DELETE USING (has_role(auth.uid(), 'admin'));
