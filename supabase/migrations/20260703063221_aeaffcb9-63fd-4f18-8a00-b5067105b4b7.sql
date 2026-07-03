CREATE OR REPLACE FUNCTION public.ensure_ai_bot_config_for_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.ai_bot_config WHERE organization_id = NEW.id) THEN
    INSERT INTO public.ai_bot_config (organization_id, enabled, system_prompt, greeting_message, model)
    VALUES (
      NEW.id,
      false,
      'Você é um atendente virtual educado e prestativo desta loja. Responda em português, de forma curta e clara. Ajude o cliente a fazer pedidos, tirar dúvidas sobre o cardápio e horário de funcionamento.',
      'Olá! 👋 Como posso te ajudar hoje?',
      'llama-3.3-70b'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_ai_bot_config_default ON public.organizations;
CREATE TRIGGER trg_org_ai_bot_config_default
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.ensure_ai_bot_config_for_org();

INSERT INTO public.ai_bot_config (organization_id, enabled, system_prompt, greeting_message, model)
SELECT
  o.id,
  false,
  'Você é um atendente virtual educado e prestativo desta loja. Responda em português, de forma curta e clara. Ajude o cliente a fazer pedidos, tirar dúvidas sobre o cardápio e horário de funcionamento.',
  'Olá! 👋 Como posso te ajudar hoje?',
  'llama-3.3-70b'
FROM public.organizations o
WHERE NOT EXISTS (SELECT 1 FROM public.ai_bot_config c WHERE c.organization_id = o.id);