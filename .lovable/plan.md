

# Sanitizar Consultas ao Banco no Frontend

## Resumo

Substituir `select("*")` por selecoes explicitas de colunas em todas as queries do frontend, eliminando a exposicao de dados sensiveis (como `user_id`, campos financeiros e IDs internos) nas respostas de rede visiveis no DevTools. Nenhuma navegacao ou funcionalidade sera alterada.

## Problema

Atualmente, varias queries usam `select("*")`, o que faz o banco retornar todas as colunas -- incluindo dados sensiveis como `user_id` de proprietarios, `pix_key`, `subscription_status`, etc. Esses dados ficam visiveis na aba Network do navegador, mesmo que o frontend nao os utilize.

## Alteracoes por Arquivo

### 1. `src/hooks/useOrganization.ts` (query publica - vitrine)

**Antes:** `select("*")` retorna `user_id`, `subscription_status`, `subscription_plan`, `trial_ends_at`, etc.

**Depois:** Selecionar apenas os campos usados nas paginas publicas (UnitPage, TableOrderPage, KitchenPage, WaiterPage):

```
select("id, name, slug, description, emoji, primary_color, logo_url, whatsapp, business_hours, pix_key, store_address, delivery_config, pix_confirmation_mode")
```

Campos removidos da resposta: `user_id`, `subscription_status`, `subscription_plan`, `trial_ends_at`, `onboarding_done`, `created_at`.

Nota: `pix_key` permanece porque e exibido no checkout PIX ao cliente (por design). `pix_confirmation_mode` e necessario para o fluxo de pagamento.

---

### 2. `src/hooks/useAuth.tsx` (query autenticada - dono)

**Antes:** `select("*")` na query de organizacao do dono.

**Depois:** Selecionar os campos usados pelo contexto de autenticacao:

```
select("id, name, slug, description, emoji, primary_color, logo_url, user_id, whatsapp, subscription_status, subscription_plan, onboarding_done, trial_ends_at")
```

Aqui o `user_id` e necessario para o contexto auth. `subscription_status` e `subscription_plan` sao usados no dashboard. Mas campos como `pix_key`, `store_address`, `delivery_config` e `business_hours` nao sao usados no contexto auth e serao removidos.

---

### 3. `src/hooks/useOrders.ts` - `useTables`

**Antes:** `select("*")` na query de mesas.

**Depois:** `select("id, organization_id, number, label")` -- remove `created_at` que nao e usado.

---

### 4. `src/hooks/useMenuItems.ts`

**Antes:** `select("*")` na query de itens do menu.

**Depois:** `select("id, organization_id, name, price, description, category, image_url, available")` -- remove `created_at`.

---

### 5. `src/hooks/useSuggestions.ts`

**Antes:** `select("*")` na query de sugestoes.

**Depois:** `select("id, organization_id, name, description, status, votes, created_at")` -- ja retorna tudo que e usado, mas torna explicito.

---

### 6. `src/hooks/useCashSession.ts`

**Antes:** `select("*")` em cash_sessions e cash_withdrawals.

**Depois:**
- cash_sessions: `select("id, organization_id, opened_at, closed_at, opening_balance, closing_balance, notes, created_at")`
- cash_withdrawals: `select("id, session_id, organization_id, amount, reason, created_at")`

Estas tabelas ja sao protegidas por RLS (dono apenas), mas a selecao explicita segue boas praticas.

---

### 7. `src/hooks/useCoupons.ts`

**Antes:** `select("*")` na query de cupons.

**Depois:** `select("id, organization_id, code, type, value, min_order, max_uses, uses, active, expires_at, created_at")` -- selecao explicita.

---

## O Que NAO Muda

- Nenhuma interface visual
- Nenhuma rota ou navegacao
- Nenhum fluxo de checkout, cozinha, garcom ou dashboard
- As RPCs de cupom ja criadas continuam identicas
- As politicas RLS permanecem como estao

## Impacto Principal

A query mais importante e a de `useOrganization.ts` (publica), que hoje expoe `user_id` e dados de assinatura para qualquer visitante via DevTools. Apos a correcao, esses campos deixarao de aparecer nas respostas de rede das paginas publicas.

