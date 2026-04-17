ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS service_modes JSONB NOT NULL DEFAULT '{"delivery": true, "pickup": true}'::jsonb;

COMMENT ON COLUMN public.organizations.service_modes IS 'Modos de atendimento ativos: {"delivery": bool, "pickup": bool}. Pelo menos um deve ser true.';