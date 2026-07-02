
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('android','ios','web')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_org ON public.fcm_tokens(organization_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user ON public.fcm_tokens(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fcm_tokens TO authenticated;
GRANT ALL ON public.fcm_tokens TO service_role;

ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fcm_tokens_owner_select" ON public.fcm_tokens
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT id FROM public.organizations WHERE user_id = auth.uid())
  );

CREATE POLICY "fcm_tokens_owner_insert" ON public.fcm_tokens
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (SELECT id FROM public.organizations WHERE user_id = auth.uid())
  );

CREATE POLICY "fcm_tokens_owner_update" ON public.fcm_tokens
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "fcm_tokens_owner_delete" ON public.fcm_tokens
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_fcm_tokens_updated_at
  BEFORE UPDATE ON public.fcm_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.notify_order_canceled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'cancelled' AND (OLD.status IS DISTINCT FROM 'cancelled') THEN
    PERFORM net.http_post(
      url := 'https://xrzudhylpphnzousilye.supabase.co/functions/v1/send-push-notification',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := json_build_object(
        'organization_id', NEW.organization_id,
        'order_number', NEW.order_number,
        'event_type', 'order_canceled'
      )::jsonb
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_order_canceled ON public.orders;
CREATE TRIGGER trg_notify_order_canceled
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_canceled();
