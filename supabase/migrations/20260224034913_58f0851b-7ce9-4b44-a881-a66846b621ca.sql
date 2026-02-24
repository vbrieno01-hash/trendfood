
-- Sales conversations table
CREATE TABLE public.sales_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Nova conversa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_conversations_select_admin" ON public.sales_conversations
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "sales_conversations_insert_admin" ON public.sales_conversations
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = admin_user_id);

CREATE POLICY "sales_conversations_update_admin" ON public.sales_conversations
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin') AND auth.uid() = admin_user_id);

CREATE POLICY "sales_conversations_delete_admin" ON public.sales_conversations
  FOR DELETE USING (public.has_role(auth.uid(), 'admin') AND auth.uid() = admin_user_id);

CREATE TRIGGER update_sales_conversations_updated_at
  BEFORE UPDATE ON public.sales_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sales messages table
CREATE TABLE public.sales_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.sales_conversations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_messages_select_admin" ON public.sales_messages
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "sales_messages_insert_admin" ON public.sales_messages
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "sales_messages_update_admin" ON public.sales_messages
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "sales_messages_delete_admin" ON public.sales_messages
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Index for fast message lookup
CREATE INDEX idx_sales_messages_conversation ON public.sales_messages(conversation_id, created_at);
