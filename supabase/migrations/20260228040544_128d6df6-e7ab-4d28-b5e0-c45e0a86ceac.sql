
-- Tabela de insumos (ingredientes em estoque)
CREATE TABLE public.stock_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'un',
  quantity NUMERIC NOT NULL DEFAULT 0,
  min_quantity NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;

-- Owner CRUD
CREATE POLICY "stock_items_select_public" ON public.stock_items
  FOR SELECT USING (true);

CREATE POLICY "stock_items_insert_owner" ON public.stock_items
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM organizations WHERE id = stock_items.organization_id)
  );

CREATE POLICY "stock_items_update_owner" ON public.stock_items
  FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM organizations WHERE id = stock_items.organization_id)
  );

CREATE POLICY "stock_items_delete_owner" ON public.stock_items
  FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM organizations WHERE id = stock_items.organization_id)
  );

-- Tabela de vínculo produto ↔ insumo
CREATE TABLE public.menu_item_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  quantity_used NUMERIC NOT NULL DEFAULT 1,
  UNIQUE(menu_item_id, stock_item_id)
);

ALTER TABLE public.menu_item_ingredients ENABLE ROW LEVEL SECURITY;

-- Select público (trigger precisa ler)
CREATE POLICY "menu_item_ingredients_select_public" ON public.menu_item_ingredients
  FOR SELECT USING (true);

CREATE POLICY "menu_item_ingredients_insert_owner" ON public.menu_item_ingredients
  FOR INSERT WITH CHECK (
    auth.uid() = (
      SELECT o.user_id FROM organizations o
      JOIN menu_items mi ON mi.organization_id = o.id
      WHERE mi.id = menu_item_ingredients.menu_item_id
    )
  );

CREATE POLICY "menu_item_ingredients_update_owner" ON public.menu_item_ingredients
  FOR UPDATE USING (
    auth.uid() = (
      SELECT o.user_id FROM organizations o
      JOIN menu_items mi ON mi.organization_id = o.id
      WHERE mi.id = menu_item_ingredients.menu_item_id
    )
  );

CREATE POLICY "menu_item_ingredients_delete_owner" ON public.menu_item_ingredients
  FOR DELETE USING (
    auth.uid() = (
      SELECT o.user_id FROM organizations o
      JOIN menu_items mi ON mi.organization_id = o.id
      WHERE mi.id = menu_item_ingredients.menu_item_id
    )
  );

-- Function: deduz estoque e desativa produtos sem estoque
CREATE OR REPLACE FUNCTION public.deduct_stock_and_disable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _item RECORD;
  _ingredient RECORD;
  _new_qty NUMERIC;
BEGIN
  -- Só executa quando paid muda de false para true
  IF NEW.paid = true AND OLD.paid = false THEN
    -- Para cada item do pedido
    FOR _item IN
      SELECT oi.menu_item_id, oi.quantity
      FROM order_items oi
      WHERE oi.order_id = NEW.id
        AND oi.menu_item_id IS NOT NULL
    LOOP
      -- Para cada ingrediente vinculado ao item
      FOR _ingredient IN
        SELECT mii.stock_item_id, mii.quantity_used
        FROM menu_item_ingredients mii
        WHERE mii.menu_item_id = _item.menu_item_id
      LOOP
        -- Subtrai do estoque
        UPDATE stock_items
        SET quantity = quantity - (_ingredient.quantity_used * _item.quantity)
        WHERE id = _ingredient.stock_item_id;

        -- Verifica se ficou <= 0
        SELECT quantity INTO _new_qty
        FROM stock_items WHERE id = _ingredient.stock_item_id;

        IF _new_qty <= 0 THEN
          -- Desativa todos os produtos que usam esse insumo
          UPDATE menu_items
          SET available = false
          WHERE id IN (
            SELECT mii2.menu_item_id
            FROM menu_item_ingredients mii2
            WHERE mii2.stock_item_id = _ingredient.stock_item_id
          );
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger na tabela orders
CREATE TRIGGER trg_deduct_stock_on_paid
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_stock_and_disable();
