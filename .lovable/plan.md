

## Plano: Corrigir frete não aparecendo nos pedidos

### Problema
Para pedidos de entrega, o frete só é salvo nas notas do pedido quando `deliveryFee > 0` ou `freeShipping === true`. Isso falha em três cenários:

1. **"Outro bairro" selecionado** (`__outro__`) — `useNeighborhoodFee` não encontra match → `fee: 0, freeShipping: false` → nenhum FRETE salvo
2. **Loja sem bairros cadastrados** — nenhum dropdown aparece, `selectedNeighborhood` fica vazio → fee 0 → sem FRETE
3. **Endereço no display** — quando `selectedNeighborhood === "__outro__"`, esse valor bruto aparece literalmente no endereço do pedido

Em todos esses casos, o pedido de entrega é salvo **sem campo FRETE** nas notas, então a comanda impressa não mostra frete e o cálculo de receita no dashboard ignora a taxa.

### Correções

**Arquivo: `src/pages/UnitPage.tsx`** — 3 alterações:

**1) Corrigir construção do `freteNote`** — sempre incluir FRETE para entregas:
```typescript
const freteNote = orderType !== "Entrega" ? null
  : freeShipping ? "FRETE:Grátis"
  : deliveryFee > 0 ? `FRETE:${fmt(deliveryFee)}`
  : "FRETE:Sob consulta";
```
Isso garante que TODA entrega tenha FRETE nas notas — seja valor, grátis ou "sob consulta".

Aplicar nos **dois locais** onde `freteNote` é construído (PIX automático ~linha 375 e fluxo normal ~linha 471).

**2) Corrigir `fullCustomerAddressDisplay`** — substituir `"__outro__"` por texto legível:
```typescript
const displayNeighborhood = selectedNeighborhood === "__outro__" 
  ? "Outro bairro" 
  : selectedNeighborhood;
const fullCustomerAddressDisplay = [
  customerStreet, customerNumber, customerComplement, displayNeighborhood
].map((p) => p.trim()).filter(Boolean).join(", ");
```

**3) Corrigir labels de frete no WhatsApp** — o `freightLabel` na mensagem do WhatsApp também ignora o caso `fee === 0 && !freeShipping`:
```typescript
const freightLabel = orderType === "Retirada" ? "Grátis"
  : freeShipping ? "Grátis"
  : deliveryFee > 0 ? fmt(deliveryFee)
  : "Sob consulta";
```
Aplicar nos dois blocos de construção de mensagem WhatsApp (~linha 429 e ~linha 549).

### Impacto
- **Lojas com bairros configurados**: frete sempre aparece na comanda e no WhatsApp
- **Lojas sem bairros**: entrega salva com "FRETE:Sob consulta" — pelo menos a informação existe
- **"Outro bairro"**: endereço mostra "Outro bairro" em vez de `__outro__`
- **Receita do dashboard**: `extractDeliveryFee` já trata "Sob consulta" como 0, sem quebrar
- **Lojas antigas**: pedidos antigos sem FRETE continuam funcionando normalmente

### Arquivos alterados
- `src/pages/UnitPage.tsx` (4 trechos: 2× freteNote, 1× fullCustomerAddressDisplay, 2× freightLabel)

