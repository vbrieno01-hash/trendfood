
CREATE TABLE public.whatsapp_free_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  instance_name TEXT UNIQUE,
  instance_token TEXT,
  status TEXT NOT NULL DEFAULT 'not_provisioned',
  phone_connected TEXT,
  webhook_configured BOOLEAN NOT NULL DEFAULT false,
  connected_at TIMESTAMPTZ,
  server_url TEXT,
  trial_started_at TIMESTAMPTZ,
  trial_expires_at TIMESTAMPTZ,
  trial_expired BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_free_org ON public.whatsapp_free_instances(organization_id);
CREATE INDEX idx_wa_free_token ON public.whatsapp_free_instances(instance_token);
CREATE INDEX idx_wa_free_trial_expires ON public.whatsapp_free_instances(trial_expires_at)
  WHERE trial_expired = false AND trial_expires_at IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_free_instances TO authenticated;
GRANT ALL ON public.whatsapp_free_instances TO service_role;

ALTER TABLE public.whatsapp_free_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_free_select_owner" ON public.whatsapp_free_instances
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM public.organizations WHERE id = organization_id)
  );

CREATE POLICY "wa_free_select_admin" ON public.whatsapp_free_instances
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "wa_free_update_owner" ON public.whatsapp_free_instances
  FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM public.organizations WHERE id = organization_id)
  );

CREATE POLICY "wa_free_update_admin" ON public.whatsapp_free_instances
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "wa_free_delete_owner" ON public.whatsapp_free_instances
  FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM public.organizations WHERE id = organization_id)
  );

CREATE POLICY "wa_free_delete_admin" ON public.whatsapp_free_instances
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_wa_free_updated_at
  BEFORE UPDATE ON public.whatsapp_free_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.autoprovision_wa_free()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.whatsapp_free_instances (organization_id, status)
  VALUES (NEW.id, 'not_provisioned')
  ON CONFLICT (organization_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orgs_autoprovision_wa_free
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.autoprovision_wa_free();

-- Backfill para orgs existentes
INSERT INTO public.whatsapp_free_instances (organization_id, status)
SELECT id, 'not_provisioned' FROM public.organizations
ON CONFLICT (organization_id) DO NOTHING;
