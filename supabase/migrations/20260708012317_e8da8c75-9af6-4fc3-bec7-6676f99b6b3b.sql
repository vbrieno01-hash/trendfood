DROP TRIGGER IF EXISTS trg_orgs_autoprovision_wa_free ON public.organizations;
DROP FUNCTION IF EXISTS public.autoprovision_wa_free() CASCADE;
DROP TABLE IF EXISTS public.whatsapp_free_instances CASCADE;