

# Teste completo Multi-unidade + Funcionalidade de deletar unidade

## Contexto

O fluxo de criacao de nova unidade ja esta funcionando com heranca de plano (`CreateUnitDialog.tsx` passa `parentPlan`). Porem, nao existe nenhuma funcionalidade no app para **deletar uma unidade**. O banco ja permite (RLS policy `organizations_delete_own` existe), mas falta a UI e a logica de limpeza de dados filhos.

## Acoes no banco de dados

### 1. Atualizar "Loja Matriz" para Enterprise (para teste)

```text
UPDATE organizations 
SET subscription_plan = 'enterprise', trial_ends_at = NULL 
WHERE id = 'fa7affd1-389b-4c93-b925-507ec39a559e'
```

### 2. Corrigir "bebidas" para Enterprise

```text
UPDATE organizations 
SET subscription_plan = 'enterprise', trial_ends_at = NULL 
WHERE id = 'e75374b7-edab-4272-bee0-260458a989df'
```

### 3. Deletar lojas de teste antigas

Remover dados filhos e depois as organizacoes de teste (Lanchonete Teste, Loja Parse Test, Loja Teste CEP, Loja Trial Teste, Loja Onboarding Test, Lanche do Carlos Teste, Burguer Teste, teste50).

## Mudancas de codigo

### 1. Adicionar botao de deletar no OrgSwitcher

**Arquivo: `src/components/dashboard/OrgSwitcher.tsx`**

- Adicionar prop `onDelete: (orgId: string) => void`
- Para cada org que NAO seja a org ativa, mostrar um icone de lixeira (Trash2) ao lado
- Nao permitir deletar a unica org restante (precisa ter pelo menos 1)
- Nao permitir deletar a org ativa (precisa trocar primeiro)

### 2. Criar funcao de deletar unidade no DashboardPage

**Arquivo: `src/pages/DashboardPage.tsx`**

- Criar handler `handleDeleteUnit(orgId)` que:
  1. Mostra um AlertDialog de confirmacao ("Tem certeza? Todos os dados dessa unidade serao perdidos")
  2. Deleta dados filhos na ordem: order_items (via orders), orders, menu_items, tables, cash_withdrawals, cash_sessions, coupons, suggestions, organization_secrets
  3. Deleta a organizacao
  4. Chama `refreshOrganization()` para atualizar a lista
  5. Mostra toast de sucesso

### 3. Criar componente de confirmacao de exclusao

**Arquivo: `src/components/dashboard/DeleteUnitDialog.tsx`**

- Dialog de confirmacao com AlertDialog
- Mostra o nome da unidade que sera deletada
- Aviso em vermelho: "Todos os pedidos, cardapio, mesas e dados serao permanentemente excluidos"
- Botao "Excluir unidade" em vermelho
- Deleta todos os dados filhos antes de deletar a org

## Teste end-to-end

Apos implementar, testar pelo browser:

1. Login com conta teste-multiunit
2. Verificar que "Loja Matriz" aparece como Enterprise
3. Abrir OrgSwitcher, clicar "Nova unidade"
4. Criar "Loja Norte" - verificar que nasce Enterprise
5. Trocar entre unidades no switcher
6. Deletar "Loja Norte" pelo botao de lixeira
7. Confirmar que foi removida do switcher e do banco
