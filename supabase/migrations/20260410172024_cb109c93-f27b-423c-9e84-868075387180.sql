
DROP POLICY IF EXISTS "improvements_select_admin" ON public.improvement_tasks;
DROP POLICY IF EXISTS "improvements_insert_admin" ON public.improvement_tasks;
DROP POLICY IF EXISTS "improvements_update_admin" ON public.improvement_tasks;
DROP POLICY IF EXISTS "improvements_delete_admin" ON public.improvement_tasks;

CREATE POLICY "improvements_select_admin" ON public.improvement_tasks FOR SELECT TO public USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "improvements_insert_admin" ON public.improvement_tasks FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "improvements_update_admin" ON public.improvement_tasks FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "improvements_delete_admin" ON public.improvement_tasks FOR DELETE TO public USING (has_role(auth.uid(), 'admin'));
