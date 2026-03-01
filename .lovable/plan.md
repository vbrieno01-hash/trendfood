

## Reativação Automática de Produtos ao Repor Estoque

### Problema
O trigger `deduct_stock_and_disable` desativa produtos quando o estoque zera, mas não existe lógica reversa para reativá-los quando o estoque é reposto.

### Solução
Criar um trigger no banco de dados na tabela `stock_items` que dispara em `UPDATE` quando a quantidade muda de `≤ 0` para `> 0`. Esse trigger:

1. Identifica todos os `menu_items` vinculados ao insumo reposto (via `menu_item_ingredients`)
2. Para cada produto, verifica se **todos** os seus ingredientes têm `quantity > 0`
3. Se sim, reativa o produto (`available = true`)

### Detalhes técnicos

**Nova função SQL:** `reactivate_menu_items_on_restock()`
- Trigger: `AFTER UPDATE` em `stock_items`
- Condição: `OLD.quantity <= 0 AND NEW.quantity > 0`
- Lógica: Para cada `menu_item` ligado ao `stock_item` atualizado, verificar se não existe nenhum ingrediente com estoque ≤ 0. Se todos ok, `UPDATE menu_items SET available = true`.

**Migration SQL:**
```sql
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
```

**Nenhuma alteração de código frontend necessária** — o trigger dispara automaticamente quando o hook `useUpdateStockItem` atualiza a quantidade via Supabase, e o dashboard já reflete o campo `available` dos menu_items.

### Impacto
- Ao salvar um insumo com quantidade > 0 (vindo de 0), os produtos vinculados são reativados se todos os ingredientes estiverem em estoque
- Funciona tanto pela aba Estoque quanto por qualquer outra via de atualização
- Sem risco de reativar produto com outro ingrediente zerado

