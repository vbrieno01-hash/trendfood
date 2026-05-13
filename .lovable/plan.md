
## Problema

O painel admin mostra MRR e receita usando valores **fixos** de tabela (R$ 99 Pro / R$ 249 Enterprise), ignorando:
- Ciclo de cobrança (mensal, trimestral, anual têm preços diferentes em `platform_plans`)
- Promoções (ex.: 50% no primeiro mês)
- Cupons / descontos manuais

Resultado: 2 assinaturas suas com 50% off aparecem como R$ 198 quando você lucrou ~R$ 99. Hoje **não existe** lugar no banco que registre quanto cada cliente realmente pagou em cada cobrança — `pending_subscription_payments` está vazio e `activation_logs` não guarda valor.

## Solução

Criar um **ledger de pagamentos** que registra cada cobrança aprovada (valor real), alimentado automaticamente pelos webhooks e editável manualmente pelo admin. O painel passa a somar receita a partir desse ledger.

### 1. Nova tabela `subscription_payments` (migration)

Campos: `organization_id`, `payment_id` (único, vindo do Mercado Pago), `plan`, `billing_cycle`, `amount_cents` (valor REAL pago), `promo_applied`, `paid_at`, `source` (`mp_webhook` | `manual` | `cakto` | `lifetime`), `notes`.

RLS: somente admin lê/escreve. Service role insere via webhook.

### 2. Webhook `mp-webhook` grava cada cobrança

Quando o MP envia evento `payment.approved`, insere uma linha em `subscription_payments` com `amount_cents = round(transaction_amount * 100)` e `payment_id` único (idempotente: ON CONFLICT DO NOTHING). Já temos esse valor disponível no código (`mpData.transaction_amount`).

Mesma coisa em `universal-activation-webhook` (Cakto) — usa o `amount` do payload.

### 3. Painel admin: receita real

Em `AdminPage.tsx` (linhas 348–369):
- **MRR** = soma de `amount_cents` em `subscription_payments` dos últimos 30 dias.
- **Receita total** = `SUM(amount_cents)` agregada por organização.
- **Por loja**: lista de pagamentos reais (data, valor, ciclo, promo) substitui o cálculo `monthsActive * planValue`.

### 4. Backfill + entrada manual

Nova aba/seção em "Detalhe da loja" (admin) com:
- Lista de pagamentos da loja (tabela editável).
- Botão **"Adicionar pagamento manual"** com campos: data, valor (R$), plano, ciclo, observação. Use isso agora para registrar suas 2 cobranças de 50%.
- Editar/excluir entrada manual (não permite editar `mp_webhook` para preservar auditoria, só `manual`).

### 5. Exportação para declaração fiscal

Botão **"Exportar receita (CSV)"** com filtro de período (mês/trimestre/ano). Colunas: `data, loja, cnpj/cpf, plano, ciclo, valor_pago, payment_id, fonte`. Um único CSV serve tanto para conferência interna quanto para entregar ao contador na hora de declarar (DAS-MEI, IRPF Carnê-Leão, ou DRE da empresa, dependendo do regime).

## Detalhes técnicos

```text
subscription_payments
├─ id (uuid pk)
├─ organization_id (fk organizations)
├─ payment_id (text unique nullable)   ← dedupe webhook
├─ plan (text)                          ← pro|enterprise|lifetime
├─ billing_cycle (text)                 ← monthly|quarterly|annual|one_time
├─ amount_cents (int not null)          ← VALOR REAL PAGO
├─ promo_applied (bool default false)
├─ paid_at (timestamptz default now())
├─ source (text default 'mp_webhook')
├─ notes (text)
└─ created_at (timestamptz default now())

índices: (organization_id, paid_at desc), (paid_at desc)
RLS: SELECT/INSERT/UPDATE/DELETE somente admin; INSERT também service_role
```

Arquivos tocados:
- `supabase/migrations/<novo>.sql` — tabela + RLS + índices
- `supabase/functions/mp-webhook/index.ts` — insert idempotente após `subscription_status='active'`
- `supabase/functions/universal-activation-webhook/index.ts` — mesmo padrão para Cakto
- `src/pages/AdminPage.tsx` — substituir `mrr`, `subscriberDetails`, `totalRevenue` por dados reais
- `src/components/admin/StorePaymentsTab.tsx` (novo) — lista + adicionar/editar/excluir manual
- `src/components/admin/AdminStoreManager.tsx` — incluir nova aba "Pagamentos"
- `src/components/admin/RevenueExportButton.tsx` (novo) — export CSV por período

## Como você "declara" depois

O CSV exportado já lista cada cobrança individual com data e valor real recebido. Esse é o documento que você (ou seu contador) usa:
- **MEI / Simples**: somar a coluna `valor_pago` no período da declaração e jogar no DAS / DEFIS.
- **Lucro Presumido / Real**: o CSV vira a base do livro-caixa; valor real recebido = receita bruta para apurar IRPJ/CSLL/PIS/COFINS.
- **Pessoa física (Carnê-Leão)**: cada linha vira um lançamento mensal.

Como o ledger é a fonte da verdade, nunca mais vai aparecer R$ 198 quando você recebeu R$ 99.
