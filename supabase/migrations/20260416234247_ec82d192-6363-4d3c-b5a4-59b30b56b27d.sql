-- Tabela singleton de configuração do robô
CREATE TABLE public.ai_bot_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT false,
  system_prompt text NOT NULL DEFAULT 'Voce é um atendente educado e prestativo de um restaurante/lanchonete via WhatsApp. Responda de forma curta, natural e profissional. Use o cardápio e horários fornecidos para responder dúvidas. Se o cliente quiser fazer pedido, oriente-o a usar o link do cardápio digital.',
  greeting_message text NOT NULL DEFAULT 'Olá! Bem-vindo(a). Como posso te ajudar hoje?',
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  test_phone text,
  test_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_bot_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_bot_config_select_admin" ON public.ai_bot_config
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "ai_bot_config_insert_admin" ON public.ai_bot_config
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "ai_bot_config_update_admin" ON public.ai_bot_config
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "ai_bot_config_delete_admin" ON public.ai_bot_config
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_ai_bot_config_updated_at
  BEFORE UPDATE ON public.ai_bot_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Linha singleton inicial
INSERT INTO public.ai_bot_config (enabled) VALUES (false);