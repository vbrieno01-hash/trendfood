
CREATE TABLE public.coupons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code            text NOT NULL,
  type            text NOT NULL,
  value           numeric NOT NULL,
  min_order       numeric NOT NULL DEFAULT 0,
  max_uses        integer,
  uses            integer NOT NULL DEFAULT 0,
  active          boolean NOT NULL DEFAULT true,
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupons_select_public" ON public.coupons
  FOR SELECT USING (true);

CREATE POLICY "coupons_insert_owner" ON public.coupons
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.organizations WHERE id = organization_id)
  );

CREATE POLICY "coupons_update_owner" ON public.coupons
  FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM public.organizations WHERE id = organization_id)
  );

CREATE POLICY "coupons_delete_owner" ON public.coupons
  FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM public.organizations WHERE id = organization_id)
  );

CREATE OR REPLACE FUNCTION public.validate_coupon_type()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.type NOT IN ('percent', 'fixed') THEN
    RAISE EXCEPTION 'Invalid coupon type: must be percent or fixed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_coupon_type
  BEFORE INSERT OR UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.validate_coupon_type();

ALTER PUBLICATION supabase_realtime ADD TABLE public.coupons;
