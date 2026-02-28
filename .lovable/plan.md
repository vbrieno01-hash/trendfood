

## Plano: Corrigir exclusao de lojas pelo admin

### Problema raiz
As politicas de seguranca (RLS) das tabelas so permitem exclusao pelo **dono** da loja (`auth.uid() = user_id`). Quando o admin tenta excluir, as operacoes retornam sucesso mas deletam 0 linhas. A loja "volta" porque nunca foi realmente excluida.

### Solucao

**1. Adicionar politicas RLS de DELETE para admins nas tabelas relevantes** (migration SQL):

Tabelas que precisam de politica `DELETE` para admin:
- `organizations`
- `orders`
- `order_items`
- `menu_items`
- `tables`
- `cash_withdrawals`
- `cash_sessions`
- `coupons`
- `suggestions`
- `organization_secrets`
- `menu_item_addons`
- `menu_item_ingredients`
- `stock_items`
- `deliveries`
- `courier_shifts`
- `couriers`
- `fila_impressao`
- `device_tokens`
- `whatsapp_instances`

Para cada tabela, criar:
```sql
CREATE POLICY "<table>_delete_admin" ON public.<table>
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
```

**2. Adicionar politica SELECT para admin em tabelas que o admin precisa consultar** (para buscar `order_items` por `order_id`):
- `order_items` — ja tem `select_public`, ok
- `orders` — ja tem `select_public`, ok

**3. Atualizar `DeleteUnitDialog.tsx`** para tambem deletar tabelas filhas adicionais que faltam:
- `menu_item_addons` (via menu_item_ids)
- `menu_item_ingredients` (via menu_item_ids)
- `stock_items`
- `deliveries`
- `courier_shifts`
- `couriers`
- `fila_impressao`
- `device_tokens`
- `whatsapp_instances`

**4. Adicionar verificacao de erro apos o delete** para confirmar que a exclusao realmente ocorreu (checar `.count` ou refetch).

### Detalhes tecnicos
- Todas as politicas usam `has_role(auth.uid(), 'admin'::app_role)` — mesmo padrao ja usado em `activation_logs`
- No `DeleteUnitDialog.tsx`, buscar `menu_items` ids primeiro para deletar `menu_item_addons` e `menu_item_ingredients` antes de deletar `menu_items`
- No `AdminPage.tsx`, o `onDeleted` ja faz `setOrgs(filter)` — isso esta ok, mas vamos adicionar um refetch para garantir sincronia

