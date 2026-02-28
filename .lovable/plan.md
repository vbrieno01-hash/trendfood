

# Plano: Adicionar número sequencial de pedido por loja

## Problema
Os pedidos não têm número de ordem. O usuário quer ver "Pedido #1", "#2", "#3" etc., com numeração independente por loja.

## Solução

### 1) Banco de dados — nova coluna + trigger automático

Adicionar coluna `order_number` (integer) na tabela `orders`. Um trigger `BEFORE INSERT` calcula automaticamente o próximo número para aquela `organization_id`:

```sql
ALTER TABLE orders ADD COLUMN order_number integer;

-- Preencher pedidos existentes com número sequencial por loja
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY created_at) AS rn
  FROM orders
)
UPDATE orders SET order_number = numbered.rn FROM numbered WHERE orders.id = numbered.id;

-- Trigger para auto-incrementar por organização
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(MAX(order_number), 0) + 1 INTO NEW.order_number
  FROM orders WHERE organization_id = NEW.organization_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_order_number
BEFORE INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION set_order_number();
```

### 2) Interface Order — adicionar campo

Em `src/hooks/useOrders.ts`, adicionar `order_number?: number` à interface `Order`.

### 3) KDS (KitchenTab) — exibir número

No card do pedido, mostrar `#${order.order_number}` ao lado de "Mesa X" ou "ENTREGA".

### 4) Recibo impresso — exibir número

- `src/lib/printOrder.ts` — `PrintableOrder` ganha `order_number?: number`
- `src/lib/formatReceiptText.ts` — linha `Pedido #N` acima dos itens
- `src/lib/printOrder.ts` — HTML do recibo browser inclui número
- `src/components/dashboard/ReceiptPreview.tsx` — preview mostra exemplo

### 5) Histórico (HistoryTab) — exibir número

Mostrar coluna/número do pedido na listagem de histórico.

## Arquivos alterados

```
MIGRATION: adicionar order_number + trigger
EDIT: src/hooks/useOrders.ts — interface Order
EDIT: src/components/dashboard/KitchenTab.tsx — exibir #N
EDIT: src/lib/printOrder.ts — PrintableOrder + HTML
EDIT: src/lib/formatReceiptText.ts — linha Pedido #N
EDIT: src/components/dashboard/ReceiptPreview.tsx — preview
```

