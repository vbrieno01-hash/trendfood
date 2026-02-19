
-- Tabela separada para guardar tokens de gateway PIX (nunca exposta publicamente)
CREATE TABLE public.organization_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  pix_gateway_provider text,
  pix_gateway_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.organization_secrets ENABLE ROW LEVEL SECURITY;

-- Somente o dono da org pode ler/escrever
CREATE POLICY secrets_select_owner ON public.organization_secrets
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = organization_id));

CREATE POLICY secrets_insert_owner ON public.organization_secrets
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = organization_id));

CREATE POLICY secrets_update_owner ON public.organization_secrets
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = organization_id));

CREATE POLICY secrets_delete_owner ON public.organization_secrets
  FOR DELETE USING (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = organization_id));

-- Trigger para updated_at
CREATE TRIGGER update_organization_secrets_updated_at
  BEFORE UPDATE ON public.organization_secrets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar coluna gateway_payment_id na tabela orders para rastrear pagamentos
ALTER TABLE public.orders ADD COLUMN gateway_payment_id text DEFAULT NULL;
