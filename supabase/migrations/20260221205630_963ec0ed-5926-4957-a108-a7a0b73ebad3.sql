
-- 1. Create print queue table
CREATE TABLE public.fila_impressao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  conteudo_txt text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  printed_at timestamptz
);

ALTER TABLE public.fila_impressao ENABLE ROW LEVEL SECURITY;

-- RLS: owner only
CREATE POLICY "fila_impressao_select_owner" ON public.fila_impressao
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM organizations WHERE id = fila_impressao.organization_id)
  );

CREATE POLICY "fila_impressao_insert_owner" ON public.fila_impressao
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM organizations WHERE id = fila_impressao.organization_id)
  );

CREATE POLICY "fila_impressao_update_owner" ON public.fila_impressao
  FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM organizations WHERE id = fila_impressao.organization_id)
  );

CREATE POLICY "fila_impressao_delete_owner" ON public.fila_impressao
  FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM organizations WHERE id = fila_impressao.organization_id)
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.fila_impressao;

-- 2. Add print_mode column to organizations
ALTER TABLE public.organizations
ADD COLUMN print_mode text NOT NULL DEFAULT 'browser';
