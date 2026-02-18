
# Rebuild Completo — SaaS Multi-tenant "Mural de Sugestões"

## Estado atual do projeto

O projeto já tem uma base sólida:
- Tabelas `organizations` e `suggestions` no banco de dados
- Página pública (`/unidade/:slug`) usando dados mock
- Dashboard (`/unidade/:slug/dashboard`) usando dados mock
- SignUpPage (`/cadastro`) com Supabase Auth integrado (mas fluxo quebrado por RLS RESTRICTIVE)
- Rota de autenticação apontando para `/cadastro`

## O que será feito (escopo completo)

---

### 1. Banco de Dados — Migrações

**Migração A — Corrigir RLS + adicionar tabela `profiles` + novos campos**

Ações:
- Dropar todas as políticas RESTRICTIVE atuais de `organizations` e `suggestions`
- Recriar como PERMISSIVE
- Criar tabela `profiles` (id, user_id, full_name, avatar_url)
- Adicionar coluna `primary_color` (TEXT, default `#f97316`) em `organizations`
- Adicionar coluna `logo_url` (TEXT, nullable) em `organizations`
- Criar Storage Bucket `logos` (público) para upload de logos

**Migração B — Auto-confirm email**

Habilitar auto-confirm no Auth para que o `signUp()` retorne sessão válida imediatamente, permitindo o INSERT em `organizations`.

---

### 2. Autenticação — `/auth`

Substituir a rota `/cadastro` por `/auth` com uma única página contendo dois painéis:

**Sign Up (Cadastro):**
- fullName, email, password
- businessName, slug (gerado automaticamente)
- Chama `supabase.auth.signUp()` → insere em `profiles` e `organizations`
- Redireciona para `/dashboard`

**Login:**
- email, password
- Chama `supabase.auth.signInWithPassword()`
- Detecta a organização do usuário pelo `user_id` → redireciona para `/dashboard`

Também criar um hook `useAuth()` que expõe `user`, `session`, e `organization` do usuário logado.

---

### 3. Painel Administrativo — `/dashboard`

Substituir o `DashboardPage.tsx` atual (baseado em mock + senha) por um painel real com dados do banco.

**Layout com sidebar:**
- Logo/nome da lanchonete no topo da sidebar
- Menu: Home, Mural, Perfil da Loja, Configurações
- Botão "Ver página pública" e "Sair"
- Protegido por rota autenticada (redireciona para `/auth` se não logado)

**Tab: Home**
- Cards de estatísticas: Total de sugestões, Pendentes, Em Análise, No Cardápio
- Lista das top 5 sugestões por votos

**Tab: Mural (Gerenciar Sugestões)**
- Filtro por status: Todas / Pendente / Analisando / No Cardápio
- Cards com: nome, descrição, votos, status
- Ações: alterar status (3 opções), editar texto inline, excluir (com confirmação)
- Skeleton screen durante carregamento
- Suporte a DELETE (precisará de nova política RLS)

**Tab: Perfil da Loja**
- Upload de logo (Supabase Storage bucket `logos`)
- Editar: nome, descrição, emoji, slug, `primary_color` (color picker)
- Preview da URL pública

**Tab: Configurações**
- Alterar senha
- Zona de perigo: excluir conta

---

### 4. Página Pública — `/unidade/:slug`

Refatorar completamente de mock para dados reais:

- Buscar organização pelo slug (SELECT + WHERE slug = :slug)
- Buscar sugestões da organização (ORDER BY votes DESC)
- Aplicar `primary_color` da organização como CSS custom property
- Exibir logo da lanchonete (se houver)
- Mural de sugestões com botão de voto (LocalStorage para anti-duplicate)
- Botão flutuante `+` para abrir modal/formulário de sugestão
- Skeleton screen durante carregamento
- INSERT de nova sugestão vai direto ao banco
- Voto: UPDATE votes = votes + 1 (via RPC ou UPDATE direto)

**Novos status:**
- `pending` = "Pendente"
- `analyzing` = "Analisando"
- `on_menu` = "No Cardápio"

---

### 5. Landing Page — `/`

Atualizar:
- Botão "Criar minha conta" → `/auth`
- Links de demo funcionarão com slugs reais do banco
- Manter o design atual, apenas ajustar links

---

### 6. Arquitetura de Hooks

Criar os seguintes hooks:

- `useAuth()` — sessão do usuário + organização logada
- `useOrganization(slug)` — busca org por slug (página pública)
- `useSuggestions(orgId)` — sugestões de uma org com real-time opcional
- `useUpdateSuggestion()` — mutation para status/texto
- `useDeleteSuggestion()` — mutation com confirmação

---

## Sequência de implementação

```text
1. Migração SQL
   ├── Dropar políticas RESTRICTIVE
   ├── Recriar como PERMISSIVE
   ├── Criar tabela profiles
   ├── Adicionar colunas primary_color + logo_url em organizations
   ├── Criar storage bucket logos
   └── Policy DELETE para org owners em suggestions

2. Configurar auto-confirm email (Auth)

3. Hook useAuth() + AuthContext

4. Página /auth (signup + login em tabs)

5. Atualizar App.tsx
   ├── Rota /auth
   ├── Rota /dashboard (protegida)
   └── Remover /cadastro

6. Dashboard com sidebar
   ├── Home (stats)
   ├── Mural (CRUD completo)
   ├── Perfil da Loja (upload logo + cor)
   └── Configurações

7. Refatorar UnitPage para dados reais
   ├── Busca por slug
   ├── Primary color dinâmica
   ├── Votação real (UPDATE no banco)
   └── INSERT de sugestão real

8. Atualizar Landing Page (links)
```

---

## Arquivos criados/modificados

| Ação | Arquivo |
|---|---|
| CRIAR | `supabase/migrations/[timestamp]_full_rebuild.sql` |
| CRIAR | `src/hooks/useAuth.tsx` |
| CRIAR | `src/pages/AuthPage.tsx` |
| CRIAR | `src/pages/DashboardPage.tsx` (substituição completa) |
| CRIAR | `src/components/dashboard/Sidebar.tsx` |
| CRIAR | `src/components/dashboard/HomeTab.tsx` |
| CRIAR | `src/components/dashboard/MuralTab.tsx` |
| CRIAR | `src/components/dashboard/StoreProfileTab.tsx` |
| CRIAR | `src/components/dashboard/SettingsTab.tsx` |
| MODIFICAR | `src/pages/UnitPage.tsx` (dados reais + UI melhorada) |
| MODIFICAR | `src/pages/Index.tsx` (links atualizados) |
| MODIFICAR | `src/App.tsx` (novas rotas) |
| REMOVER | `src/pages/SignUpPage.tsx` |
| REMOVER | `src/data/mockData.ts` |

---

## Segurança (RLS)

| Tabela | Ação | Quem |
|---|---|---|
| organizations | SELECT | Público (por slug) |
| organizations | SELECT | Dono (auth.uid = user_id) |
| organizations | INSERT | Dono (auth.uid = user_id) |
| organizations | UPDATE | Dono (auth.uid = user_id) |
| suggestions | SELECT | Público |
| suggestions | INSERT | Público (visitantes sem conta) |
| suggestions | UPDATE | Dono da organização |
| suggestions | DELETE | Dono da organização |
| profiles | SELECT | Próprio usuário |
| profiles | INSERT | Próprio usuário |
| profiles | UPDATE | Próprio usuário |
| logos (storage) | SELECT | Público |
| logos (storage) | INSERT | Autenticado |
