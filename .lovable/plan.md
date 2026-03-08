

## Plano: Usar taxa de frete do lojista (bairros) na entrega do motoboy

### Problema
Quando uma delivery é criada, o sistema usa `courier_config.base_fee` e depois sobrescreve com cálculo de distância via geocoding. Mas o frete real já foi definido pelo lojista na tabela de bairros e está salvo nas `notes` do pedido como `FRETE:R$ 6,00`.

### Solução

**Arquivo: `src/hooks/useCreateDelivery.ts`**

1. Adicionar função `parseFreteFromNotes(notes)`:
   - Extrai `FRETE:R$ X,XX` → retorna número (ex: 6.00)
   - `FRETE:Grátis` → retorna 0
   - Não encontrado → retorna `null` (fallback para base_fee)

2. Em `createDeliveryForOrder`: usar o frete extraído das notes como `fee` no insert

3. Em `calculateAndUpdateDelivery`: atualizar apenas `distance_km`, **não sobrescrever `fee`**

4. Em `recalculateNullDistances`: idem, atualizar só `distance_km`

### Fluxo

```text
Pedido notes: "...FRETE:R$ 6,00..."
  → parseFreteFromNotes → 6.00
  → INSERT delivery (fee = 6.00)
  → Background geocoding → UPDATE distance_km only
```

Um único arquivo modificado, sem migração.

