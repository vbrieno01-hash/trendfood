-- ══════════════════════════════════════════════════════════
-- Tabela de log de notificações WhatsApp automáticas
-- Usada para: anti-duplicata (60s) + auditoria de falhas
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.whatsapp_notification_log (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   uuid        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event      text        NOT NULL,  -- 'preparing' | 'ready' | 'out_for_delivery'
  status     text        NOT NULL DEFAULT 'sent',  -- 'sent' | 'failed'
  error      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_notification_log_order_event
  ON public.whatsapp_notification_log (order_id, event, created_at DESC);

ALTER TABLE public.whatsapp_notification_log ENABLE ROW LEVEL SECURITY;

-- Lojista pode ler os logs da própria org
CREATE POLICY "owners_can_read_notif_log"
  ON public.whatsapp_notification_log FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.organizations org ON org.id = o.organization_id
      WHERE org.user_id = auth.uid()
    )
  );
