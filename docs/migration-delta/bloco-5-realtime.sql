-- Habilita Realtime nas 19 tabelas que hoje têm Realtime ativo no prod.
-- Rodar no SQL Editor do espelho DEPOIS do restore.

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'campaign_credits',
    'coupons',
    'courier_shifts',
    'deliveries',
    'fila_impressao',
    'fila_whatsapp',
    'fiscal_invoices',
    'ifood_disputes',
    'menu_items',
    'order_items',
    'orders',
    'organizations',
    'platform_content',
    'stock_alerts',
    'stock_items',
    'suggestions',
    'support_conversations',
    'support_messages',
    'tables'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
      RAISE NOTICE 'added %', t;
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'skip % (already in publication)', t;
    END;
  END LOOP;
END $$;

-- Validação:
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
ORDER BY tablename;
