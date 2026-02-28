

## Plano: Criar plano de teste a R$ 5 para compra real

### Pré-requisito importante
Para que o checkout transparente (com `card_token_id`) funcione, suas credenciais do Mercado Pago **precisam ser de produção**, não de teste (`TEST-`). Com credenciais de teste, o erro "Card token service not found" vai continuar aparecendo.

**Você já trocou para credenciais de produção?** Se não, será necessário atualizar o secret `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_PUBLIC_KEY` com as chaves de produção antes de testar.

### Alterações

#### 1. Edge Function (`create-mp-subscription/index.ts`)
- Adicionar o plano `"free"` com preço `5.0` no mapa de preços:
  ```typescript
  const prices = { free: 5.0, pro: 99.0, enterprise: 249.0 };
  ```

#### 2. Frontend (`SubscriptionTab.tsx`)
- Alterar o plano Grátis para mostrar preço `"R$ 5"` e permitir selecioná-lo (remover a exclusão do `onSelect` para `free`)
- Atualizar o `cta` de "Plano atual" para "Assinar por R$ 5"

### Depois do teste
Reverteremos o preço do plano Grátis para R$ 0 e removeremos o botão de assinar.

