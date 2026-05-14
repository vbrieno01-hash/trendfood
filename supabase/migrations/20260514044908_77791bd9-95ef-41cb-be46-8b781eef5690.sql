CREATE TABLE IF NOT EXISTS public.platform_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_secrets_select_admin" ON public.platform_secrets
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "platform_secrets_all_admin" ON public.platform_secrets
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_platform_secrets_updated_at
  BEFORE UPDATE ON public.platform_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();