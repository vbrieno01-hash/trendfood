
CREATE TABLE public.improvement_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pendente',
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.improvement_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "improvements_select_admin" ON public.improvement_tasks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "improvements_insert_admin" ON public.improvement_tasks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "improvements_update_admin" ON public.improvement_tasks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "improvements_delete_admin" ON public.improvement_tasks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_improvement_tasks_updated_at
  BEFORE UPDATE ON public.improvement_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
