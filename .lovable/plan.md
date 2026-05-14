## O que vai ser feito

Expandir a aba **Capacidade** (admin) com uma seção **"Usuários cadastrados"** que lista os 62 usuários do `auth.users`, mostrando quem nunca criou loja e permitindo ações administrativas.

### 1. Função SQL nova: `admin_list_users()`
- `SECURITY DEFINER`, restrita a `has_role(auth.uid(), 'admin')`.
- Retorna por usuário: `id`, `email`, `created_at`, `last_sign_in_at`, `provider` (email/google), `org_count`, `org_names[]`, `is_admin` (bool).
- JOIN `auth.users` ↔ `organizations` (LEFT) ↔ `user_roles`.
- Ordenação: mais recentes primeiro.

### 2. Função SQL nova: `admin_delete_user(_user_id uuid)`
- `SECURITY DEFINER`, só admin.
- Bloqueia se for o próprio admin (`brenojackson30@gmail.com`) — não dá pra se auto-deletar.
- Faz cascata: deleta `organizations` do usuário (que já cascateia o resto), `user_roles`, depois `auth.users`.
- Retorna `jsonb` com `success` + contagem do que foi removido.

### 3. Função SQL nova: `admin_toggle_admin_role(_user_id uuid, _grant boolean)`
- `SECURITY DEFINER`, só admin.
- `_grant=true` → INSERT em `user_roles (user_id, 'admin')` se não existir.
- `_grant=false` → DELETE em `user_roles`. Bloqueia se for o próprio admin principal.

### 4. UI na `CapacityTab.tsx`
Nova seção abaixo do card "Lojas por plano":

- Header com contagem total + filtros:
  - Busca por email (input)
  - Toggle "Só sem loja" (mostra apenas `org_count = 0`)
  - Toggle "Só admins"
- Tabela responsiva com colunas: Email • Cadastro (relativo, ex: "5d") • Último login • Lojas (badge com nº + tooltip com nomes) • Ações
- Ações por linha:
  - Botão "Tornar admin" / "Remover admin" (toggle visual)
  - Botão "Deletar" (vermelho, abre `AlertDialog` de confirmação dupla — exige digitar o email pra confirmar)
- Linhas com `org_count = 0` ganham badge cinza "sem loja" — fácil de identificar fantasmas
- Paginação client-side simples (50 por página) — 62 usuários cabem em 2 páginas
- React Query: `staleTime: 30s`, invalida ao deletar/promover

### 5. Integração com a aba existente
- Mantém o card resumo "Usuários" que já existe no topo (62)
- Adiciona link/scroll suave do card pra nova seção ("Ver lista")

## Arquivos

- **Novo:** `supabase/migrations/<ts>_admin_users_management.sql` — três funções SQL acima
- **Editado:** `src/components/admin/CapacityTab.tsx` — adiciona seção `<UsersSection />` (componente interno no mesmo arquivo, já que escopo é pequeno)

## Notas técnicas

- `auth.users` só pode ser lido via `SECURITY DEFINER` — por isso a função SQL.
- Deleção de usuário em `auth.users` exige permissões de service role; vamos fazer via função SQL com `SECURITY DEFINER` que tem grants suficientes (já é como `transfer-org-owner` opera). Se Postgres bloquear DELETE direto em `auth.users`, plano B é chamar uma Edge Function `admin-delete-user` com service role key.
- Toda ação é logada em `activation_logs` (já existe) com `source = 'admin_user_action'`.
