
-- Create referral_bonuses table
CREATE TABLE public.referral_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  referred_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bonus_days integer NOT NULL DEFAULT 10,
  referred_org_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_referral_pair UNIQUE (referrer_org_id, referred_org_id)
);

-- Enable RLS
ALTER TABLE public.referral_bonuses ENABLE ROW LEVEL SECURITY;

-- Owner can see their own bonuses (where they are the referrer)
CREATE POLICY "referral_bonuses_select_owner"
  ON public.referral_bonuses
  FOR SELECT
  USING (
    auth.uid() = (
      SELECT user_id FROM public.organizations WHERE id = referral_bonuses.referrer_org_id
    )
  );

-- Admin can see all
CREATE POLICY "referral_bonuses_select_admin"
  ON public.referral_bonuses
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role inserts (via webhook) — permissive true for service key
CREATE POLICY "referral_bonuses_insert_service"
  ON public.referral_bonuses
  FOR INSERT
  WITH CHECK (true);

-- Admin can delete
CREATE POLICY "referral_bonuses_delete_admin"
  ON public.referral_bonuses
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
