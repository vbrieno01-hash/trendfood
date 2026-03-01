-- Trigger para deduzir estoque ao pagar
CREATE TRIGGER trg_deduct_stock
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (OLD.paid = false AND NEW.paid = true)
  EXECUTE FUNCTION public.deduct_stock_and_disable();