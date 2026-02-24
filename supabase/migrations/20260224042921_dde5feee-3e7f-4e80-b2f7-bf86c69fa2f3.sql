
-- Tabela de fila do WhatsApp (mesmo padrão da fila_impressao)
CREATE TABLE public.fila_whatsapp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  incoming_message TEXT NOT NULL,
  ai_response TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.fila_whatsapp ENABLE ROW LEVEL SECURITY;

-- A edge function usa service_role, então não precisa de policies permissivas.
-- Mas para segurança, bloqueamos acesso anônimo.
-- Apenas service_role (usado nas edge functions) consegue ler/escrever.

-- Policy: ninguém via client anon consegue ler
CREATE POLICY "fila_whatsapp_select_none" ON public.fila_whatsapp
  FOR SELECT USING (false);

CREATE POLICY "fila_whatsapp_insert_none" ON public.fila_whatsapp
  FOR INSERT WITH CHECK (false);

CREATE POLICY "fila_whatsapp_update_none" ON public.fila_whatsapp
  FOR UPDATE USING (false);

CREATE POLICY "fila_whatsapp_delete_none" ON public.fila_whatsapp
  FOR DELETE USING (false);
