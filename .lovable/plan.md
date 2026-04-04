

## Plano: Corrigir parser de adicionais que quebra no preço com vírgula

### Problema encontrado no teste
O nome salvo no banco está correto: `fasf (+ 2x banana R$10,00, + 1x azeite R$2,00)`

Mas o `parseItemName` usa `.split(",")` para separar os adicionais dentro dos parênteses. Como o preço brasileiro usa vírgula decimal (`R$10,00`), o split quebra errado:

```text
Input:  "+ 2x banana R$10,00, + 1x azeite R$2,00"
Split:  ["+ 2x banana R$10", "00", "+ 1x azeite R$2", "00"]
                              ^^                        ^^  ERRADO
```

### Solução

| # | Arquivo | Mudança |
|---|---------|---------|
| 1 | `src/lib/receiptData.ts` | Trocar `.split(",")` por um split inteligente que só quebra em `, +` (vírgula seguida de `+`), preservando a vírgula decimal do preço |
| 2 | `src/pages/UnitPage.tsx` | Corrigir exibição do carrinho para mostrar quantidade dos adicionais (`2x banana` em vez de `+ banana`) |

### Detalhe tecnico
No `parseItemName`, trocar:
```typescript
// DE:
addonMatch[1].split(",").forEach(...)
// PARA:
addonMatch[1].split(/,\s*(?=\+)/).forEach(...)
```

O regex `,\s*(?=\+)` usa lookahead para só separar quando a vírgula é seguida de `+` (inicio de outro addon), ignorando vírgulas dentro de preços como `R$10,00`.

### Resultado
- Recibo mostrará corretamente: `- 2X BANANA  R$10,00`
- Carrinho mostrará: `+ 2x banana, + 1x azeite`
- 2 arquivos editados, zero mudanças no banco

