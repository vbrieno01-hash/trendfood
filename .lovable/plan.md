

## Plano: Quantidade por Adicional (suporte a 1, 2, 3+ do mesmo adicional)

### Problema
Hoje os adicionais funcionam como checkbox (ligado/desligado). O cliente não consegue pedir "3x Bacon" — só "Bacon". Na comanda/impressão, aparece apenas "- BACON" sem indicar quantidade, causando perda de informação em pedidos grandes.

### Alterações

**1. Tipo `CartItemAddon`** — adicionar campo `qty`

Atualizar em `ItemDetailDrawer.tsx` e `UnitPage.tsx`:
```typescript
type CartItemAddon = { id: string; name: string; price: number; qty: number };
```

**2. `ItemDetailDrawer.tsx`** — trocar checkbox por seletor +/- de quantidade

- Substituir o `Checkbox` por botões `+` e `-` para cada adicional
- Ao clicar `+` pela primeira vez, adiciona com `qty: 1`; cliques subsequentes incrementam
- Botão `-` decrementa; ao chegar em 0, remove do array
- O preço exibido ao lado mostra `qty × preço_unitário`
- O total do item reflete a soma: `item.price + Σ(addon.price × addon.qty)`

**3. `UnitPage.tsx`** — propagar qty nos nomes e cálculos

- **Nome no banco**: mudar de `(+ Bacon, + Cheddar)` para `(+ 3x Bacon, + 1x Cheddar)` — sempre incluir quantidade
- **Preço unitário**: já calcula `item.price + addons.reduce(...)`, ajustar para `addon.price * addon.qty`
- **Cart key**: incluir qty no hash para diferenciar "1x Bacon" de "2x Bacon"
- **WhatsApp message**: mesma lógica de `3x Bacon`

**4. `receiptData.ts` → `parseItemName`** — parsear quantidade dos adicionais

Atualizar o regex para extrair `3x Bacon` dos parênteses:
```typescript
// Antes: "Bacon" → addon "Bacon"
// Depois: "3x Bacon" → addon "3x Bacon" (mantém como string na comanda)
```
Na prática, como o nome já virá com "3x" do UnitPage, o `parseItemName` já funciona — os addons são strings livres.

**5. `ThermalReceipt.tsx`** — já exibe addons como strings, funciona automaticamente

O componente mostra `- {san(addon)}` para cada addon na lista. Como agora virá "3X BACON", a comanda mostrará corretamente sem mudança no componente.

### Fluxo visual no drawer

```text
┌─────────────────────────────────┐
│ Adicionais                      │
│                                 │
│  Bacon           [-] 2 [+]  +R$ 6,00 │
│  Cheddar         [-] 1 [+]  +R$ 3,00 │
│  Ovo                   [+]  +R$ 2,00 │
└─────────────────────────────────┘
```

- Addon sem seleção: mostra só o botão `[+]` e preço unitário
- Addon com qty > 0: mostra `[-] qty [+]` e preço total (qty × unit)

### Arquivos alterados
- `src/components/unit/ItemDetailDrawer.tsx` (UI de qty por addon)
- `src/pages/UnitPage.tsx` (tipo CartItemAddon + nome com qty + preço com qty)
- `src/lib/receiptData.ts` (nenhuma mudança necessária — addons já são strings livres)

