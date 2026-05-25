
-- 1) ai_bot_config por organização
ALTER TABLE public.ai_bot_config
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS ai_bot_config_org_unique
  ON public.ai_bot_config(organization_id)
  WHERE organization_id IS NOT NULL;

CREATE POLICY "ai_bot_config_select_owner" ON public.ai_bot_config
  FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = ai_bot_config.organization_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "ai_bot_config_insert_owner" ON public.ai_bot_config
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = ai_bot_config.organization_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "ai_bot_config_update_owner" ON public.ai_bot_config
  FOR UPDATE TO authenticated
  USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = ai_bot_config.organization_id AND o.user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = ai_bot_config.organization_id AND o.user_id = auth.uid()
    )
  );

-- 2) fila_whatsapp por organização
ALTER TABLE public.fila_whatsapp
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS fila_whatsapp_org_idx
  ON public.fila_whatsapp(organization_id, created_at DESC);

CREATE POLICY "fila_whatsapp_select_owner" ON public.fila_whatsapp
  FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = fila_whatsapp.organization_id AND o.user_id = auth.uid()
    )
  );

-- 3) Gate de plano: robô IA só pode ser ativado em planos pagos
CREATE OR REPLACE FUNCTION public.gate_ai_bot_enabled_paid_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.enabled = true
     AND NEW.organization_id IS NOT NULL
     AND public.get_effective_plan(NEW.organization_id) = 'free'
  THEN
    RAISE EXCEPTION 'Robô de WhatsApp disponível apenas no plano Pro. Faça upgrade para ativar.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_gate_ai_bot_enabled_paid_plan ON public.ai_bot_config;
CREATE TRIGGER tg_gate_ai_bot_enabled_paid_plan
  BEFORE INSERT OR UPDATE ON public.ai_bot_config
  FOR EACH ROW EXECUTE FUNCTION public.gate_ai_bot_enabled_paid_plan();
