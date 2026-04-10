
CREATE TABLE public.ifood_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  merchant_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamp with time zone,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

ALTER TABLE public.ifood_credentials ENABLE ROW LEVEL SECURITY;

-- Owner policies
CREATE POLICY "ifood_creds_select_owner" ON public.ifood_credentials
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = ifood_credentials.organization_id));

CREATE POLICY "ifood_creds_insert_owner" ON public.ifood_credentials
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM organizations WHERE id = ifood_credentials.organization_id));

CREATE POLICY "ifood_creds_update_owner" ON public.ifood_credentials
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = ifood_credentials.organization_id));

CREATE POLICY "ifood_creds_delete_owner" ON public.ifood_credentials
  FOR DELETE USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = ifood_credentials.organization_id));

-- Admin policies
CREATE POLICY "ifood_creds_select_admin" ON public.ifood_credentials
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "ifood_creds_update_admin" ON public.ifood_credentials
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "ifood_creds_delete_admin" ON public.ifood_credentials
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_ifood_credentials_updated_at
  BEFORE UPDATE ON public.ifood_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
