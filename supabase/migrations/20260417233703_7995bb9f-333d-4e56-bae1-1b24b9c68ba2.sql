CREATE TABLE public.store_version_heartbeat (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL UNIQUE,
  version text NOT NULL,
  user_agent text,
  is_standalone boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_store_version_heartbeat_last_seen ON public.store_version_heartbeat (last_seen_at DESC);
CREATE INDEX idx_store_version_heartbeat_version ON public.store_version_heartbeat (version);

ALTER TABLE public.store_version_heartbeat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_version_heartbeat_select_admin"
ON public.store_version_heartbeat
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "store_version_heartbeat_insert_owner"
ON public.store_version_heartbeat
FOR INSERT
WITH CHECK (
  auth.uid() = (SELECT user_id FROM public.organizations WHERE id = organization_id)
);

CREATE POLICY "store_version_heartbeat_update_owner"
ON public.store_version_heartbeat
FOR UPDATE
USING (
  auth.uid() = (SELECT user_id FROM public.organizations WHERE id = organization_id)
)
WITH CHECK (
  auth.uid() = (SELECT user_id FROM public.organizations WHERE id = organization_id)
);

CREATE POLICY "store_version_heartbeat_delete_admin"
ON public.store_version_heartbeat
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));