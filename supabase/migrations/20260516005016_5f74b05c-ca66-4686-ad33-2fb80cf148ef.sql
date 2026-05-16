
-- Track interruptions created on iFood Merchant API so we can remove them later
CREATE TABLE public.ifood_merchant_interruptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ifood_merchant_id text NOT NULL,
  ifood_interruption_id text NOT NULL,
  reason text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  UNIQUE (ifood_merchant_id, ifood_interruption_id)
);

CREATE INDEX idx_ifood_merch_int_org ON public.ifood_merchant_interruptions(organization_id) WHERE removed_at IS NULL;

ALTER TABLE public.ifood_merchant_interruptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read their merchant interruptions"
  ON public.ifood_merchant_interruptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM organizations o WHERE o.id = organization_id AND o.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Service role inserts/updates from edge functions

-- Trigger: when organization paused/unpaused or business_hours changed, sync to iFood
CREATE OR REPLACE FUNCTION public.tg_orgs_sync_ifood_merchant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _has_ifood boolean;
  _action text := NULL;
BEGIN
  -- Only sync if org has iFood credentials connected
  SELECT EXISTS (
    SELECT 1 FROM ifood_credentials c
    WHERE c.organization_id = NEW.id
      AND c.status = 'connected'
      AND c.merchant_id IS NOT NULL
  ) INTO _has_ifood;

  IF NOT _has_ifood THEN
    RETURN NEW;
  END IF;

  IF NEW.paused IS DISTINCT FROM OLD.paused THEN
    _action := CASE WHEN NEW.paused THEN 'pause' ELSE 'unpause' END;
  ELSIF NEW.business_hours IS DISTINCT FROM OLD.business_hours THEN
    _action := 'hours';
  END IF;

  IF _action IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://xrzudhylpphnzousilye.supabase.co/functions/v1/ifood-merchant-api',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'internal', true,
      'action', 'sync',
      'sync_action', _action,
      'organization_id', NEW.id
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orgs_sync_ifood_merchant ON public.organizations;
CREATE TRIGGER trg_orgs_sync_ifood_merchant
  AFTER UPDATE ON public.organizations
  FOR EACH ROW
  WHEN (OLD.paused IS DISTINCT FROM NEW.paused OR OLD.business_hours IS DISTINCT FROM NEW.business_hours)
  EXECUTE FUNCTION public.tg_orgs_sync_ifood_merchant();
