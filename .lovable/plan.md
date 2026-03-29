

## Plano: Corrigir observações dos pedidos nas impressões

### Problema
As observações por item **não estão sendo salvas** no banco de dados, então nunca aparecem na comanda impressa. No `UnitPage`, o campo `i.notes` (obs do item) é incluído na mensagem do WhatsApp mas **não** é anexado ao `name` do item ao salvar no banco. Como o sistema de impressão lê o nome do item e extrai a obs via `parseItemName` (padrão `| Obs: ...`), a obs simplesmente não existe no dado salvo.

### Correção

**Arquivo: `src/pages/UnitPage.tsx`** — 1 alteração

Na linha ~494, onde os itens do carrinho são mapeados para o `placeOrder.mutate`, incluir a obs no nome do item:

```typescript
// ANTES (linha 492-497):
items: cartItems.map((i) => ({
  menu_item_id: i.menuItemId,
  name: i.addons.length > 0 
    ? `${i.name} (${i.addons.map(a => `+ ${a.qty > 1 ? `${a.qty}x ` : ''}${a.name}`).join(", ")})` 
    : i.name,
  price: i.price,
  quantity: i.qty,
})),

// DEPOIS:
items: cartItems.map((i) => {
  let finalName = i.name;
  if (i.addons.length > 0) {
    finalName += ` (${i.addons.map(a => `+ ${a.qty > 1 ? `${a.qty}x ` : ''}${a.name}`).join(", ")})`;
  }
  if (i.notes.trim()) {
    finalName += ` | Obs: ${i.notes.trim()}`;
  }
  return {
    menu_item_id: i.menuItemId,
    name: finalName,
    price: i.price,
    quantity: i.qty,
  };
}),
```

Isso aplica a mesma lógica que já funciona no WhatsApp (linhas 441, 561) ao nome salvo no banco. O `parseItemName` em `receiptData.ts` já sabe extrair `| Obs: ...` do nome (linhas 118-123), então a comanda passará a exibir as obs automaticamente em todos os modos de impressão (navegador, desktop, Bluetooth).

### Por que isso resolve para todas as lojas (antigas e novas)
- **Lojas novas**: a partir da correção, todas as obs são salvas no nome do item
- **Lojas antigas**: pedidos antigos sem obs no nome continuam funcionando (o parser simplesmente não encontra obs e segue normal)
- A correção é no **ponto único de gravação** — não precisa mexer em receiptData, ThermalReceipt, nem formatReceiptText

### Arquivos alterados
- `src/pages/UnitPage.tsx` (1 trecho ~6 linhas)

