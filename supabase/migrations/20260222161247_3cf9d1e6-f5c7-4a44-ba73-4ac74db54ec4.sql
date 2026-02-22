
CREATE TABLE public.courier_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.courier_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courier_shifts_select_public" ON public.courier_shifts
  FOR SELECT USING (true);
CREATE POLICY "courier_shifts_insert_public" ON public.courier_shifts
  FOR INSERT WITH CHECK (true);
CREATE POLICY "courier_shifts_update_public" ON public.courier_shifts
  FOR UPDATE USING (true);
CREATE POLICY "courier_shifts_delete_owner" ON public.courier_shifts
  FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM organizations WHERE id = courier_shifts.organization_id)
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.courier_shifts;
