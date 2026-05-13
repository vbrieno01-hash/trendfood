ALTER TABLE public.stock_items REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_items;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;