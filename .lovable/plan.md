

## Plano: Corrigir exibição de dados da loja no painel admin

### Problema identificado
Ao abrir "Dados da Loja" de um cliente no painel admin, alguns campos aparecem vazios (endereço, chave PIX) mesmo estando configurados. Isso acontece por dois motivos:

1. **Campo `pix_key` não mapeado** — O `AdminStoreManager` busca todos os dados do banco (`select("*")`), mas não inclui `pix_key` no objeto `orgForComponents`. O campo PIX sempre aparece vazio.

2. **`refreshOrganization()` e `updateAllOrgs()` usam contexto errado** — O `StoreProfileTab` usa `useAuth()` para obter `user`, `organizations` e `refreshOrganization`. No contexto admin, essas referências apontam para as organizações do **admin**, não da loja gerenciada. Isso causa:
   - `updateAllOrgs` tenta aplicar campos compartilhados nas orgs do admin (não nas unidades do cliente)
   - `refreshOrganization` não atualiza os dados da loja gerenciada após salvar

### Arquivos alterados

**1. `src/components/admin/AdminStoreManager.tsx`**
- Adicionar `pix_key: fullOrg.pix_key` no mapeamento de `orgForComponents` (campo faltante)

**2. `src/components/dashboard/StoreProfileTab.tsx`**
- No `updateAllOrgs`: verificar se `user?.id` é diferente do `organization.user_id` (contexto admin). Se for, pular a atualização em massa — o admin não deve propagar campos para suas próprias lojas
- No `refreshOrganization`: quando em contexto admin, invalidar a query `["admin-org-full", organization.id]` ao invés de chamar `refreshOrganization()` do useAuth

### Impacto
- Endereço, PIX e demais campos aparecerão corretamente ao gerenciar lojas pelo admin
- Auto-save não vai sobrescrever dados do admin acidentalmente
- Zero mudanças no banco de dados

