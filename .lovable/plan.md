
# Controle de Caixa — Abertura, Fechamento, Sangrias e Relatório do Turno

## O que será construído

Uma nova aba **"Caixa"** no dashboard da loja com fluxo completo de gestão de caixa:

- Abertura de caixa com saldo inicial em dinheiro
- Registro de sangrias (retiradas durante o turno)
- Painel do turno ativo: receita de pedidos, entradas, saídas e saldo projetado
- Fechamento de caixa com saldo final informado e resumo do turno
- Histórico dos últimos turnos encerrados

---

## Fluxo de estados da tela

```text
┌────────────────────────┐     ┌─────────────────────────────────────────────┐
│   Caixa Fechado        │     │   Turno Aberto                              │
│                        │     │                                             │
│  [💰 Abrir Caixa]      │────▶│  Saldo inicial: R$ 200,00                  │
│                        │     │  Receita (pedidos pagos): R$ 850,00         │
└────────────────────────┘     │  Sangrias: - R$ 100,00                      │
                               │  Saldo projetado: R$ 950,00                 │
                               │                                             │
                               │  [+ Registrar Sangria]  [🔒 Fechar Caixa]  │
                               └─────────────────────────────────────────────┘
```

---

## Banco de dados — nova tabela `cash_sessions`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | Identificador único |
| `organization_id` | uuid FK | Vínculo com a loja |
| `opened_at` | timestamptz | Quando o caixa foi aberto |
| `closed_at` | timestamptz nullable | Quando foi fechado (null = turno ativo) |
| `opening_balance` | numeric | Saldo inicial informado |
| `closing_balance` | numeric nullable | Saldo final informado no fechamento |
| `notes` | text nullable | Observações opcionais |
| `created_at` | timestamptz | Timestamp de criação |

Nova tabela `cash_withdrawals` para as sangrias:

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | Identificador único |
| `session_id` | uuid FK | Vinculado ao `cash_sessions.id` |
| `organization_id` | uuid FK | Loja (para RLS simplificada) |
| `amount` | numeric | Valor retirado |
| `reason` | text nullable | Motivo da sangria |
| `created_at` | timestamptz | Momento da retirada |

### Políticas de RLS

Ambas as tabelas seguirão o mesmo padrão das outras tabelas do sistema:
- `SELECT`: público (para facilitar exibição em terminais de cozinha/garçom)
- `INSERT / UPDATE / DELETE`: apenas o dono autenticado da organização

---

## Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| `supabase/migrations/[timestamp].sql` | Nova tabela `cash_sessions`, `cash_withdrawals` + RLS |
| `src/hooks/useCashSession.ts` | Hook novo: `useActiveCashSession`, `useOpenCashSession`, `useCloseCashSession`, `useCashWithdrawals`, `useAddWithdrawal`, `useCashHistory` |
| `src/components/dashboard/CaixaTab.tsx` | Componente novo — a tela completa do caixa |
| `src/pages/DashboardPage.tsx` | Adicionar `"caixa"` ao `TabKey`, ao array de nav e ao render condicional |

---

## Detalhes da implementação

### Hook `useCashSession.ts`

```typescript
// busca o turno aberto da org (sem closed_at)
useActiveCashSession(orgId)

// busca sangrias de um turno
useCashWithdrawals(sessionId)

// abre caixa: INSERT em cash_sessions
useOpenCashSession(orgId)

// fecha caixa: UPDATE cash_sessions SET closed_at, closing_balance
useCloseCashSession(orgId)

// insere sangria
useAddWithdrawal(orgId, sessionId)

// histórico dos últimos turnos fechados
useCashHistory(orgId)
```

### Lógica de saldo projetado no turno ativo

```
saldoProjetado = opening_balance
               + receita de pedidos PAGOS durante o turno (orders.paid = true, created_at >= opened_at)
               - soma das sangrias do turno
```

A receita dos pedidos já está disponível via `useDeliveredOrders`, basta filtrar por `created_at >= session.opened_at`.

### CaixaTab — estrutura de seções

**Estado: caixa fechado**
- Card simples com botão "Abrir Caixa" e campo para saldo inicial
- Tabela dos últimos 5 turnos encerrados (data, saldo inicial, saldo final, total de vendas)

**Estado: turno ativo**
- Hero card verde com saldo projetado atual (atualizado em tempo real via react-query refetch)
- Grid 2×2 de métricas: Saldo inicial | Receita do turno | Total sangrias | Saldo projetado
- Botão "Registrar Sangria" → modal com campo de valor e motivo
- Lista de sangrias do turno atual
- Botão "Fechar Caixa" → modal de confirmação com campo de saldo final e resumo

### Posição na sidebar

A aba "Caixa" será adicionada em `navItemsOps` (seção Operações), junto com Cozinha e Garçom — pois é uma função operacional do dia-a-dia.

```text
Operações
  🔥 Cozinha (KDS)
  🔔 Painel do Garçom
  💵 Caixa           ← novo
```

---

## Sequência de execução

1. Criar migração SQL com as duas tabelas e políticas RLS
2. Criar `src/hooks/useCashSession.ts` com todos os hooks
3. Criar `src/components/dashboard/CaixaTab.tsx` com toda a UI
4. Atualizar `src/pages/DashboardPage.tsx` para registrar a nova aba

