-- Adicionar colunas faltantes
ALTER TABLE public.whatsapp_instances
  ADD COLUMN IF NOT EXISTS phone_connected TEXT,
  ADD COLUMN IF NOT EXISTS webhook_configured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Garantir unique em organization_id (uma instância por loja)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'whatsapp_instances_organization_id_key'
  ) THEN
    ALTER TABLE public.whatsapp_instances
      ADD CONSTRAINT whatsapp_instances_organization_id_key UNIQUE (organization_id);
  END IF;
END $$;

-- Garantir unique em instance_name
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'whatsapp_instances_instance_name_key'
  ) THEN
    ALTER TABLE public.whatsapp_instances
      ADD CONSTRAINT whatsapp_instances_instance_name_key UNIQUE (instance_name);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_token ON public.whatsapp_instances(instance_token);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_org ON public.whatsapp_instances(organization_id);

-- Recriar políticas
DROP POLICY IF EXISTS "wa_instances_select_owner" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "wa_instances_select_admin" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "wa_instances_delete_owner" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "wa_instances_delete_admin" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "wa_instances_update_admin" ON public.whatsapp_instances;

CREATE POLICY "wa_instances_select_owner"
ON public.whatsapp_instances FOR SELECT
USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = whatsapp_instances.organization_id));

CREATE POLICY "wa_instances_select_admin"
ON public.whatsapp_instances FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "wa_instances_delete_owner"
ON public.whatsapp_instances FOR DELETE
USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = whatsapp_instances.organization_id));

CREATE POLICY "wa_instances_delete_admin"
ON public.whatsapp_instances FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "wa_instances_update_admin"
ON public.whatsapp_instances FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_wa_instances_updated_at ON public.whatsapp_instances;
CREATE TRIGGER trg_wa_instances_updated_at
BEFORE UPDATE ON public.whatsapp_instances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();