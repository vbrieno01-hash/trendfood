
-- Table for neighborhood-based delivery fees
CREATE TABLE public.delivery_neighborhoods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  fee numeric NOT NULL DEFAULT 5.00,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique neighborhood name per org
CREATE UNIQUE INDEX idx_delivery_neighborhoods_org_name 
  ON public.delivery_neighborhoods(organization_id, LOWER(name));

-- Enable RLS
ALTER TABLE public.delivery_neighborhoods ENABLE ROW LEVEL SECURITY;

-- Public can read (customers need to see neighborhoods in checkout)
CREATE POLICY "delivery_neighborhoods_select_public"
  ON public.delivery_neighborhoods FOR SELECT
  USING (true);

-- Owner can manage
CREATE POLICY "delivery_neighborhoods_insert_owner"
  ON public.delivery_neighborhoods FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM organizations WHERE id = organization_id));

CREATE POLICY "delivery_neighborhoods_update_owner"
  ON public.delivery_neighborhoods FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = organization_id));

CREATE POLICY "delivery_neighborhoods_delete_owner"
  ON public.delivery_neighborhoods FOR DELETE
  USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = organization_id));

-- Admin can manage
CREATE POLICY "delivery_neighborhoods_delete_admin"
  ON public.delivery_neighborhoods FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
