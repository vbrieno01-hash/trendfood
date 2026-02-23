
CREATE TABLE public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'android',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "device_tokens_insert_own" ON public.device_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "device_tokens_select_own" ON public.device_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "device_tokens_delete_own" ON public.device_tokens
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "device_tokens_select_org_owner" ON public.device_tokens
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM public.organizations WHERE id = device_tokens.org_id)
  );
