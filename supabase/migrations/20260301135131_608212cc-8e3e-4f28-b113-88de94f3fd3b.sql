CREATE OR REPLACE FUNCTION public.reactivate_menu_items_on_restock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE _mi_id uuid;
BEGIN
  IF OLD.quantity <= 0 AND NEW.quantity > 0 THEN
    FOR _mi_id IN
      SELECT DISTINCT mii.menu_item_id
      FROM menu_item_ingredients mii
      WHERE mii.stock_item_id = NEW.id
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM menu_item_ingredients mii2
        JOIN stock_items si ON si.id = mii2.stock_item_id
        WHERE mii2.menu_item_id = _mi_id AND si.quantity <= 0
      ) THEN
        UPDATE menu_items SET available = true WHERE id = _mi_id;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_reactivate_on_restock
AFTER UPDATE OF quantity ON public.stock_items
FOR EACH ROW
WHEN (OLD.quantity <= 0 AND NEW.quantity > 0)
EXECUTE FUNCTION public.reactivate_menu_items_on_restock();