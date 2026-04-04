

## Plano: Mostrar quantidade e preço dos adicionais no recibo

### Problema
No recibo impresso, os adicionais aparecem como `- ALFACE`, `- OVO` sem mostrar:
1. A quantidade quando > 1 (ex: `2x Bacon`)
2. O preço individual de cada adicional

O cliente reclama que não consegue conferir o que foi cobrado nos adicionais.

### Causa raiz
- O formato salvo no banco já inclui quantidade (`+ 2x Bacon`) quando qty > 1 — isso funciona
- Mas o `parseItemName` retorna apenas o texto do addon sem preço
- O `ThermalReceipt` renderiza `- {addon}` sem nenhuma informação de preço

### Solução

| # | Arquivo | Mudança |
|---|---------|---------|
| 1 | `src/pages/UnitPage.tsx` | Incluir preço no formato do addon: `+ 2x Bacon R$5,00` em vez de `+ 2x Bacon` |
| 2 | `src/pages/TableOrderPage.tsx` | Mesma mudança no formato do addon (se existir lógica similar) |
| 3 | `src/lib/receiptData.ts` | Atualizar `parseItemName` para extrair preço do addon se presente |
| 4 | `src/components/shared/ThermalReceipt.tsx` | Exibir preço do addon na linha se disponível |

### Formato final no recibo
```text
2X X-TOSCANA PROMOCAO......R$ 52,00
  - 1X HAMBURGUER GOURMET 180G  R$ 8,00
  - 1X ALFACE                   R$ 2,00
  - 2X BACON                    R$ 10,00
OBS: SEM CEBOLA
```

### Detalhes
- O nome salvo no banco passará de `(+ Bacon, + 2x Alface)` para `(+ 1x Bacon R$3.00, + 2x Alface R$4.00)`
- `parseItemName` será atualizado para extrair qty e preço de cada addon
- O `ReceiptItem.addons` mudará de `string[]` para incluir info de qty/preço
- Pedidos antigos sem o novo formato continuam funcionando (fallback para texto puro)
- 4 arquivos editados, zero mudanças no banco

