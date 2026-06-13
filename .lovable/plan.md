## Objetivo
Hoje a aba "Lojas da Plataforma" do painel admin (`src/pages/AdminPage.tsx`) só permite filtrar por Status (Todos / Ativo / Trial) e Endereço. Não dá pra separar lojas por plano, o que dificulta visualizar quem é Pro, Enterprise, Vitalício etc.

Vamos adicionar uma linha de filtros por **Plano** com contagem em cada chip, e melhorar a navegação/ordenação.

## Mudanças (apenas em `src/pages/AdminPage.tsx`)

### 1. Novo filtro "Plano" na barra de filtros
Adicionar uma linha de chips abaixo de Status/Endereço:

```
PLANO:  [Todos] [Free] [Trial Pro] [Pro] [Enterprise] [Vitalício] [Expirado]
```

Cada chip mostra contagem ao lado, ex: `Pro (5)`, `Free (10)`.

Lógica por chip:
- **Free**: `subscription_plan === "free"` e sem trial ativo
- **Trial Pro**: `subscription_plan === "free"` + `trial_ends_at` futuro (trial ativo)
- **Pro**: `subscription_plan === "pro"` e `trial_ends_at` futuro (ou nulo)
- **Enterprise**: `subscription_plan === "enterprise"` e ativo
- **Vitalício**: `subscription_plan === "lifetime"`
- **Expirado**: plano pago (`pro`/`enterprise`) com `trial_ends_at` no passado

### 2. Estado e filtro
- Novo `useState` `planFilter: "all" | "free" | "trial" | "pro" | "enterprise" | "lifetime" | "expired"`
- Adicionar `.filter()` em `filteredOrgs` aplicando a regra acima.
- Atualizar `clearFilters()` para resetar `planFilter`.
- Atualizar `hasActiveFilters` para considerar `planFilter !== "all"`.

### 3. Ajuste no filtro Status existente
O chip "Trial" do Status hoje sobrepõe a ideia. Manter, mas o filtro por Plano funciona em paralelo (AND). Sem mudanças quebradas.

### 4. Ordenação (bônus pequeno)
Adicionar um dropdown discreto "Ordenar por": Mais recentes (padrão) / Mais antigas / Nome A-Z / Plano (Enterprise→Free). Implementado com um `select` simples nativo no canto direito da barra, sem dependências novas.

### 5. Layout
A barra de filtros já é `flex-wrap`. A nova linha "PLANO:" segue o mesmo padrão visual dos chips existentes (mesmas classes Tailwind). Sem mudanças de design system.

## Fora de escopo
- Não mexer no card de loja, no CSV export (o CSV já inclui o plano), em queries Supabase, RLS, ou em qualquer lógica de negócio.
- Não criar componente novo — tudo dentro do `AdminPage.tsx` para manter consistência com os outros filtros locais.
