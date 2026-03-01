
CREATE TABLE public.terms_acceptances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.terms_acceptances ENABLE ROW LEVEL SECURITY;

-- Owner can insert
CREATE POLICY "terms_acceptances_insert_owner"
ON public.terms_acceptances
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Owner can read their own
CREATE POLICY "terms_acceptances_select_owner"
ON public.terms_acceptances
FOR SELECT
USING (auth.uid() = user_id);

-- Admin can read all
CREATE POLICY "terms_acceptances_select_admin"
ON public.terms_acceptances
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
