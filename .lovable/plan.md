

## Módulo de Afiliados / Indicações

### Visão Geral
Criar um sistema de referral onde cada loja existente pode indicar novos estabelecimentos via link único. O admin acompanha as indicações no painel, e o lojista vê seu link e contagem de indicados no dashboard.

### 1. Migração de Banco de Dados

**Coluna na tabela `organizations`:**
```sql
ALTER TABLE organizations ADD COLUMN referred_by_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
```

Isso permite rastrear qual organização indicou qual.

**RLS:** Nenhuma policy nova necessária — a coluna é lida pela policy `organizations_select_public` já existente e escrita apenas pelo owner no signup.

### 2. Signup com `?ref=`

**Arquivo:** `src/pages/AuthPage.tsx`

- Capturar o parâmetro `ref` da URL (ex: `/cadastro?ref=UUID_DA_LOJA`).
- No `handleSignup`, ao inserir na tabela `organizations`, incluir `referred_by_id: refParam || null`.
- O link público será `trendfood.lovable.app/cadastro?ref=ID_DA_ORG`.

### 3. Aba "Indicações" no Admin

**Novo arquivo:** `src/components/admin/ReferralsTab.tsx`

- Buscar `organizations` onde `referred_by_id IS NOT NULL`.
- Exibir tabela com: Loja indicada, Indicado por (nome), Plano atual, Status, Data de cadastro.
- KPI cards: Total de indicações, Indicações que viraram assinantes.

**Arquivo:** `src/pages/AdminPage.tsx`

- Adicionar `"indicacoes"` ao tipo `AdminTab`.
- Adicionar item de nav com ícone `Share2` e label "Indicações".
- Renderizar `<ReferralsTab />` quando `activeTab === "indicacoes"`.

### 4. Seção "Ganhe Desconto" no Dashboard do Cliente

**Novo arquivo:** `src/components/dashboard/ReferralSection.tsx`

- Exibir o link de indicação da loja (`/cadastro?ref={org.id}`) com botão "Copiar link".
- Buscar `organizations` onde `referred_by_id = org.id` para contar quantos amigos o lojista já trouxe.
- Card visual simples com ícone, contagem e CTA.

**Arquivo:** `src/pages/DashboardPage.tsx`

- Adicionar `"referral"` como nova `TabKey` na sidebar, dentro do grupo AJUSTES.
- Renderizar `<ReferralSection />` quando `activeTab === "referral"`.

### Detalhes Técnicos
- A coluna `referred_by_id` é nullable e referencia `organizations(id)` com `ON DELETE SET NULL`.
- A query de contagem no dashboard usa `supabase.from("organizations").select("id", { count: "exact" }).eq("referred_by_id", orgId)`.
- Nenhum edge function necessário — tudo via client SDK com RLS existente.

