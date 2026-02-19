
-- Create cash_sessions table
CREATE TABLE public.cash_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  opened_at timestamp with time zone NOT NULL DEFAULT now(),
  closed_at timestamp with time zone,
  opening_balance numeric NOT NULL DEFAULT 0,
  closing_balance numeric,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cash_sessions_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

-- Create cash_withdrawals table
CREATE TABLE public.cash_withdrawals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  amount numeric NOT NULL,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cash_withdrawals_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
  CONSTRAINT cash_withdrawals_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_cash_sessions_organization_id ON public.cash_sessions(organization_id);
CREATE INDEX idx_cash_sessions_closed_at ON public.cash_sessions(closed_at);
CREATE INDEX idx_cash_withdrawals_session_id ON public.cash_withdrawals(session_id);

-- Enable RLS
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS policies for cash_sessions
CREATE POLICY "cash_sessions_select_public"
  ON public.cash_sessions FOR SELECT USING (true);

CREATE POLICY "cash_sessions_insert_owner"
  ON public.cash_sessions FOR INSERT
  WITH CHECK (auth.uid() = (
    SELECT organizations.user_id FROM organizations WHERE organizations.id = cash_sessions.organization_id
  ));

CREATE POLICY "cash_sessions_update_owner"
  ON public.cash_sessions FOR UPDATE
  USING (auth.uid() = (
    SELECT organizations.user_id FROM organizations WHERE organizations.id = cash_sessions.organization_id
  ));

CREATE POLICY "cash_sessions_delete_owner"
  ON public.cash_sessions FOR DELETE
  USING (auth.uid() = (
    SELECT organizations.user_id FROM organizations WHERE organizations.id = cash_sessions.organization_id
  ));

-- RLS policies for cash_withdrawals
CREATE POLICY "cash_withdrawals_select_public"
  ON public.cash_withdrawals FOR SELECT USING (true);

CREATE POLICY "cash_withdrawals_insert_owner"
  ON public.cash_withdrawals FOR INSERT
  WITH CHECK (auth.uid() = (
    SELECT organizations.user_id FROM organizations WHERE organizations.id = cash_withdrawals.organization_id
  ));

CREATE POLICY "cash_withdrawals_delete_owner"
  ON public.cash_withdrawals FOR DELETE
  USING (auth.uid() = (
    SELECT organizations.user_id FROM organizations WHERE organizations.id = cash_withdrawals.organization_id
  ));
