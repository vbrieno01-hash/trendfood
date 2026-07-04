-- 1) Backfill apenas para planos pagos (o gate gate_ai_bot_enabled_paid_plan bloqueia Free)
UPDATE public.ai_bot_config abc
SET enabled = true
FROM public.organizations o
WHERE abc.organization_id = o.id
  AND abc.enabled = false
  AND public.get_effective_plan(o.id) <> 'free';

-- 2) Default da coluna: novos inserts nascem true (o gate bloqueia Free na hora)
ALTER TABLE public.ai_bot_config ALTER COLUMN enabled SET DEFAULT true;

-- 3) Trigger de loja nova: cria ai_bot_config habilitado; se for Free, insere false pra não disparar o gate
CREATE OR REPLACE FUNCTION public.ensure_ai_bot_config_for_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_enabled boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.ai_bot_config WHERE organization_id = NEW.id) THEN
    v_enabled := public.get_effective_plan(NEW.id) <> 'free';
    INSERT INTO public.ai_bot_config (organization_id, enabled, system_prompt, greeting_message, model)
    VALUES (
      NEW.id,
      v_enabled,
      'Você é um atendente virtual educado e prestativo desta loja. Responda em português, de forma curta e clara. Ajude o cliente a fazer pedidos, tirar dúvidas sobre o cardápio e horário de funcionamento.',
      'Olá! 👋 Como posso te ajudar hoje?',
      'llama-3.3-70b'
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- 4) Nova RPC admin: liga/desliga o robô (respeita o gate de plano)
CREATE OR REPLACE FUNCTION public.admin_set_ai_bot_enabled(_org_id uuid, _enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.ai_bot_config (organization_id, enabled)
  VALUES (_org_id, _enabled)
  ON CONFLICT (organization_id) DO UPDATE SET enabled = EXCLUDED.enabled;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_set_ai_bot_enabled(uuid, boolean) TO authenticated;