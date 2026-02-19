
# Controle de Caixa — Implementação Completa

## Situação atual

Nenhum dos 4 arquivos necessários foi criado. O plano aprovado precisa ser implementado do zero:

- Sem migração de banco para `cash_sessions` e `cash_withdrawals`
- Sem `src/hooks/useCashSession.ts`
- Sem `src/components/dashboard/CaixaTab.tsx`
- `DashboardPage.tsx` ainda sem a aba "Caixa"

## O que será feito

### 1. Migração SQL (banco de dados)

Criar duas tabelas novas:

**`cash_sessions`** — controla os turnos do caixa:
- `id`, `organization_id`, `opened_at`, `closed_at` (null = turno ativo), `opening_balance`, `closing_balance`, `notes`, `created_at`

**`cash_withdrawals`** — registra as sangrias:
- `id`, `session_id`, `organization_id`, `amount`, `reason`, `created_at`

RLS seguindo o padrão das outras tabelas:
- `SELECT`: público (mesma política de `orders`, `menu_items`, etc.)
- `INSERT / UPDATE / DELETE`: somente o dono autenticado da organização

### 2. Hook `src/hooks/useCashSession.ts`

Funções que o componente vai usar:

- `useActiveCashSession(orgId)` — busca turno ativo (sem `closed_at`) via react-query
- `useCashWithdrawals(sessionId)` — lista sangrias do turno ativo
- `useOpenCashSession()` — mutation para abrir caixa (INSERT em `cash_sessions`)
- `useCloseCashSession()` — mutation para fechar caixa (UPDATE `closed_at` + `closing_balance`)
- `useAddWithdrawal()` — mutation para registrar sangria
- `useCashHistory(orgId)` — últimos 5 turnos encerrados

**Lógica do saldo projetado:**
Calculada no componente a partir dos pedidos pagos (`orders` onde `paid = true` e `created_at >= session.opened_at`) já disponíveis via query existente de pedidos do dashboard.

### 3. Componente `src/components/dashboard/CaixaTab.tsx`

**Estado A — Caixa Fechado:**
- Card centralizado com campo "Saldo inicial (R$)" e botão "Abrir Caixa"
- Tabela abaixo com histórico dos últimos 5 turnos (data/hora abertura, saldo inicial, saldo final, diferença)

**Estado B — Turno Ativo:**
- Hero card verde com saldo projetado em destaque (atualizado a cada 30s via `refetchInterval`)
- Grid 2×2 de métricas: Saldo inicial | Receita do turno | Total sangrias | Saldo projetado
- Seção de sangrias: lista das sangrias do turno + botão "Registrar Sangria"
- Modal de sangria: campos valor (numérico) e motivo (texto livre)
- Botão "Fechar Caixa" → modal com resumo do turno + campo para saldo final contado fisicamente + campo de observações

### 4. Atualizar `src/pages/DashboardPage.tsx`

- Adicionar `"caixa"` ao tipo `TabKey`
- Inserir item na seção `navItemsOps`:
  ```
  { key: "caixa", icon: <Wallet />, label: "Caixa" }
  ```
- Adicionar render condicional: `{activeTab === "caixa" && <CaixaTab orgId={organization.id} />}`
- Importar `CaixaTab` e ícone `Wallet` do lucide-react

## Sequência de execução

1. Criar migração SQL com as duas tabelas + RLS + índices
2. Criar `src/hooks/useCashSession.ts`
3. Criar `src/components/dashboard/CaixaTab.tsx`
4. Atualizar `src/pages/DashboardPage.tsx`
