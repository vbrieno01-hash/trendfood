

## Plano: Multiplicar quantidade dos adicionais pelo qty do item no recibo

### Problema
Addon armazenado como `+ 1x Batata frita R$5,00` representa qty **por unidade** do item. Quando o item tem qty=2, o recibo mostra `1x Batata frita R$5,00` — deveria mostrar `2x Batata frita R$10,00`.

### Alteração

**`src/lib/receiptData.ts`** — Em `buildReceiptData`, após chamar `parseItemName`, multiplicar cada addon pela qty do item:

```typescript
// Dentro do .map de rawItems (linha ~208)
const { baseName, addons: rawAddons, itemObs } = parseItemName(item.name);

// Multiplicar addon qty × item qty
const addons = rawAddons.map(addon => {
  if (item.quantity <= 1) return addon;
  // Parse "1x Bacon R$5,00" → qty=1, name=Bacon, price=5.00
  const m = addon.match(/^(\d+)x\s+(.+?)\s+R\$\s*([\d.,]+)$/i);
  if (!m) return addon;
  const addonQty = parseInt(m[1]) * item.quantity;
  const unitPrice = parseFloat(m[3].replace(",", "."));
  const totalPrice = unitPrice * item.quantity;
  const priceStr = totalPrice.toFixed(2).replace(".", ",");
  return `${addonQty}x ${m[2]} R$${priceStr}`;
});
```

**Testes** — Atualizar `receiptData.test.ts` e `e2e-receipt-sanitization.test.ts`:
- Item com qty=2 e addon `1x Batata frita R$5,00` → resultado `2x Batata frita R$10,00`
- Item com qty=1 → addon inalterado

### Impacto
- 1 arquivo de código + 2 de testes
- Zero impacto em dados armazenados
- Ambos os consumidores (ThermalReceipt visual e formatReceiptText bluetooth) já exibem o addon string diretamente — a correção propaga automaticamente

