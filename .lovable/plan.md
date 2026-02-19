
# Sistema de Roles Seguro com `user_roles`

## Problema atual

O `AdminPage.tsx` verifica o acesso assim:

```typescript
const ADMIN_EMAILS = ["brenojackson30@gmail.com"];
if (!ADMIN_EMAILS.includes(user.email ?? "")) return <Navigate to="/" replace />;
```

Isso é **inseguro** por dois motivos:
1. A checagem é feita 100% no cliente (frontend). Qualquer usuário pode manipular o JavaScript ou o estado React para burlar a verificação.
2. A `platform_config` tem uma política RLS que permite UPDATE para **qualquer usuário autenticado** — ou seja, qualquer loja dona do sistema consegue alterar as configurações do painel admin pelo console do navegador.

## Solução completa

### Camada 1 — Banco de dados (migração SQL)

**1. Enum de roles:**
```sql
CREATE TYPE public.app_role AS ENUM ('admin');
```

**2. Tabela `user_roles` (separada, conforme boas práticas):**
```sql
CREATE TABLE public.user_roles (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role    app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
```

**3. Função `has_role` com `SECURITY DEFINER`** (evita recursão de RLS e impede que o cliente acesse a tabela diretamente):
```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

**4. Políticas RLS da `user_roles`** — somente admin pode ver roles:
```sql
CREATE POLICY "user_roles_select_admin"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
```

**5. Corrigir RLS da `platform_config`** — substituir "qualquer autenticado" por "somente admin":
```sql
DROP POLICY "platform_config_update_authed" ON public.platform_config;
CREATE POLICY "platform_config_update_admin"
  ON public.platform_config FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

**6. Inserir o role admin para o usuário existente** (ID já confirmado: `ccdbec3f-f8fb-46fd-9613-3350f60ed324`):
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('ccdbec3f-f8fb-46fd-9613-3350f60ed324', 'admin')
ON CONFLICT DO NOTHING;
```

### Camada 2 — Hook `useAuth` (verificação server-side)

Adicionar `isAdmin: boolean` ao contexto, consultando a função `has_role` via RPC ou direto na tabela (a função `SECURITY DEFINER` garante que só o próprio admin consegue ler sua entrada):

```typescript
// Dentro de fetchOrganization, após buscar a org:
const { data: roleData } = await supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", userId)
  .eq("role", "admin")
  .maybeSingle();

setIsAdmin(!!roleData);
```

### Camada 3 — `AdminPage.tsx` (remover hardcode de e-mail)

Substituir a verificação por e-mail hardcoded pela verificação de role vinda do contexto:

```typescript
// ANTES (inseguro):
const ADMIN_EMAILS = ["brenojackson30@gmail.com"];
if (!ADMIN_EMAILS.includes(user.email ?? "")) return <Navigate to="/" replace />;

// DEPOIS (seguro):
const { user, isAdmin, loading } = useAuth();
if (!isAdmin) return <Navigate to="/" replace />;
```

### Camada 4 — Edge Function `create-admin-user`

Atualizar para que ao criar o usuário admin, também insira a role na tabela `user_roles` automaticamente.

---

## Fluxo de segurança após a correção

```text
Acessa /admin
  → useAuth carrega: busca sessão + role do usuário no banco
  → Se não autenticado: redireciona para /auth?redirect=/admin
  → Se autenticado mas sem role 'admin': redireciona para /
  → Se autenticado COM role 'admin': abre o painel ✓

Tenta editar platform_config pelo console do navegador
  → RLS chama has_role(auth.uid(), 'admin')
  → Usuário comum não tem role → UPDATE negado pelo banco ✓
```

## Arquivos modificados

| Camada | Arquivo | O que muda |
|---|---|---|
| Banco | Migration SQL | Cria `app_role`, `user_roles`, função `has_role`, corrige RLS de `platform_config`, insere role do admin |
| Hook | `src/hooks/useAuth.tsx` | Adiciona `isAdmin: boolean` ao contexto, buscado do banco |
| Página | `src/pages/AdminPage.tsx` | Remove `ADMIN_EMAILS` hardcoded, usa `isAdmin` do contexto |
| Edge Function | `supabase/functions/create-admin-user/index.ts` | Também insere role 'admin' ao criar o usuário |
