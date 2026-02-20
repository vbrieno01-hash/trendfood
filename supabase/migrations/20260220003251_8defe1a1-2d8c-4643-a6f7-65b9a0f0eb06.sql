DROP POLICY IF EXISTS "cash_sessions_select_public" ON public.cash_sessions;
CREATE POLICY "cash_sessions_select_owner" ON public.cash_sessions
  FOR SELECT USING (
    auth.uid() = (
      SELECT o.user_id FROM organizations o
      WHERE o.id = cash_sessions.organization_id
    )
  );