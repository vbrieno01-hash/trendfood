CREATE TABLE public.whatsapp_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  instance_name text NOT NULL,
  instance_token text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY wi_select_owner ON public.whatsapp_instances FOR SELECT
  USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = organization_id));

CREATE POLICY wi_insert_owner ON public.whatsapp_instances FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM organizations WHERE id = organization_id));

CREATE POLICY wi_update_owner ON public.whatsapp_instances FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = organization_id));

CREATE POLICY wi_delete_owner ON public.whatsapp_instances FOR DELETE
  USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = organization_id));