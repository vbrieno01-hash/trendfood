CREATE UNIQUE INDEX IF NOT EXISTS ifood_event_log_event_id_uniq 
  ON public.ifood_event_log(ifood_event_id) 
  WHERE ifood_event_id IS NOT NULL;

ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS ifood_synced_externally boolean DEFAULT false;