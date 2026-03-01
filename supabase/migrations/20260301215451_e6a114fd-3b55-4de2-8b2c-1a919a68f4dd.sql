
-- Create global_addons table
CREATE TABLE public.global_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.global_addons ENABLE ROW LEVEL SECURITY;

-- Owner CRUD
CREATE POLICY "global_addons_all_owner" ON public.global_addons
FOR ALL USING (
  auth.uid() = (SELECT user_id FROM organizations WHERE id = global_addons.organization_id)
);

-- Public read
CREATE POLICY "global_addons_select_public" ON public.global_addons
FOR SELECT USING (true);

-- Admin delete
CREATE POLICY "global_addons_delete_admin" ON public.global_addons
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
