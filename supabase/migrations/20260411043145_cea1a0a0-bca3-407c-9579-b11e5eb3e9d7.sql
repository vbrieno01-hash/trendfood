
CREATE TABLE public.telegram_automations_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  event_type text NOT NULL,
  ref_date date NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_telegram_auto_org_event_date
  ON public.telegram_automations_log (organization_id, event_type, ref_date);

ALTER TABLE public.telegram_automations_log ENABLE ROW LEVEL SECURITY;

-- No policies = only service_role can access
