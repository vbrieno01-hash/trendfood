
-- Create activation_logs table
CREATE TABLE public.activation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  org_name text,
  old_plan text,
  new_plan text,
  old_status text,
  new_status text,
  source text NOT NULL DEFAULT 'manual',
  admin_email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activation_logs_select_admin"
  ON public.activation_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "activation_logs_insert_admin"
  ON public.activation_logs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "activation_logs_insert_service"
  ON public.activation_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "activation_logs_delete_admin"
  ON public.activation_logs FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
