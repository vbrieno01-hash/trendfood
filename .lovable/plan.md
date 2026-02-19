
# Configuracao de confirmacao PIX nas definicoes da loja

## Resumo

Adicionar uma opcao na aba "Perfil da Loja" (secao Pagamentos) onde o dono do comercio escolhe como funciona a confirmacao do PIX. A escolha dele define o fluxo automaticamente para todos os pedidos.

## As 3 opcoes

| Opcao | Descricao | Fluxo do pedido |
|-------|-----------|-----------------|
| **Direto** (padrao) | Pedido vai direto pra cozinha, sem confirmar PIX | Status fica `pending`, vai pra cozinha imediatamente |
| **Manual** | Garcom/caixa confirma que o PIX caiu antes de enviar pra cozinha | Status fica `awaiting_payment` ate o caixa confirmar |
| **Automatico (API)** | Integracao com gateway de pagamento (futuro) | Placeholder nas configuracoes, mostra aviso "em breve" |

## Detalhes tecnicos

### 1. Banco de dados

Adicionar coluna `pix_confirmation_mode` na tabela `organizations`:

```sql
ALTER TABLE public.organizations
  ADD COLUMN pix_confirmation_mode text NOT NULL DEFAULT 'direct';
```

Valores possiveis: `direct`, `manual`, `automatic`

### 2. `src/components/dashboard/StoreProfileTab.tsx`

Na secao "Pagamentos" (logo abaixo da chave PIX), adicionar um seletor com as 3 opcoes:

- **Direto** - "O pedido vai direto pra cozinha. O PIX e apenas informativo."
- **Manual** - "O pedido fica aguardando ate voce confirmar que o PIX caiu."
- **Automatico** - "Integrado com gateway de pagamento (em breve)" - desabilitado

Salvar o valor junto com os outros campos no `handleSave`.

### 3. `src/hooks/useOrganization.ts`

Adicionar `pix_confirmation_mode` na interface `Organization`.

### 4. `src/pages/TableOrderPage.tsx`

Ao escolher PIX no `handleSelectPayment`:

- Se `org.pix_confirmation_mode === 'manual'`: atualizar o pedido com `status = 'awaiting_payment'`
- Se `org.pix_confirmation_mode === 'direct'` (ou nao definido): manter `status = 'pending'` (comportamento atual)

### 5. `src/hooks/useOrders.ts`

Adicionar hooks para o modo manual:

- `useAwaitingPaymentOrders(orgId)` - busca pedidos com `status = 'awaiting_payment'`
- `useConfirmPixPayment(orgId)` - muda status de `awaiting_payment` para `pending`

Incluir realtime para atualizacao automatica.

### 6. `src/components/dashboard/WaiterTab.tsx`

Adicionar secao "Aguardando Pagamento PIX" no topo (so aparece quando ha pedidos com `status = 'awaiting_payment'`):

- Card com cor roxa/laranja mostrando mesa, itens, valor
- Botao "Confirmar Pagamento PIX" que libera o pedido pra cozinha

### 7. Cozinha (`KitchenTab.tsx`)

Nenhuma alteracao necessaria - ja filtra por `["pending", "preparing"]`, pedidos `awaiting_payment` nao aparecem.

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| Migracao SQL | Adicionar coluna `pix_confirmation_mode` |
| `src/hooks/useOrganization.ts` | Adicionar campo na interface |
| `src/components/dashboard/StoreProfileTab.tsx` | Seletor de modo na secao Pagamentos |
| `src/pages/TableOrderPage.tsx` | Logica condicional baseada no modo |
| `src/hooks/useOrders.ts` | Hooks para pedidos aguardando pagamento |
| `src/components/dashboard/WaiterTab.tsx` | Secao de confirmacao manual |
