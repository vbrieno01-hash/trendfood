
ALTER TABLE public.fiscal_invoices DROP CONSTRAINT IF EXISTS fiscal_invoices_status_check;
ALTER TABLE public.fiscal_invoices
  ADD CONSTRAINT fiscal_invoices_status_check
  CHECK (status IN ('pending','processing','authorized','rejected','cancelled','blocked_quota'));
