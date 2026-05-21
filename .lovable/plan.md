## O que encontrei no /admin

Fiz varredura completa: li o código + abri o painel + olhei logs do banco. Achei **3 bugs reais** e 1 ruído de log que já tínhamos discutido. Provavelmente o que você viu é o **bug nº 1** (números repetidos no topo).

---

### Bug 1 — Card "A Receber (Mês)" mostra o mesmo valor que MRR
No print do dashboard, os 3 primeiros cards aparecem todos com **R$ 99,00**: "Receita Estimada", "MRR" e "A Receber (Mês)". O terceiro está literalmente reutilizando a variável `mrr` no código (`AdminPage.tsx`, card "A Receber (Mês)" → `value={fmt(mrr)}`).

**Correção:** trocar para o cálculo real de recorrência prevista nos próximos 30 dias — somar `platform_plans.price_cents` × assinantes ativos por ciclo (mensal cheio + anual rateado por 1/12).

### Bug 2 — Gráfico "MRR por Mês" usa preço chumbado R$ 99 / R$ 249
Em `GrowthCharts.tsx`:
```
const mrr = pro * 99 + enterprise * 249;
```
Isso quebra duas regras do projeto:
- Viola a memória **pricing-source-of-truth** (`platform_plans` é a verdade).
- Não bate com o card MRR de cima: gráfico mostra **R$ 198** ("2 pro × 99") mas o card real (vindo do ledger `subscription_payments`) mostra **R$ 99**.

**Correção:** buscar `platform_plans` (preço atual de pro/enterprise mensal) e usar esses valores; idealmente, derivar a série histórica direto de `subscription_payments` agrupado por mês — fica consistente com o card.

### Bug 3 — Gráfico MRR ignora status da assinatura
Mesmo arquivo: conta toda org com `subscription_plan='pro'`, sem checar se está `active`. Lojas canceladas/expiradas continuam inflando o MRR histórico.

**Correção:** filtrar por `subscription_status === 'active'` (ou, melhor, sumarizar do ledger como dito acima — mata os 3 problemas de uma vez).

---

### Bonus — Log poluído (já discutido, não fiz)
Erros recorrentes no postgres: `new row violates row-level security policy for table "store_version_heartbeat"` (vinha em rajadas). Esse não é do admin — é o `useVersionHeartbeat` rodando pra usuário não-dono. Posso fazer junto se quiser, mas é independente.

---

## Plano de execução

1. **`src/components/admin/GrowthCharts.tsx`** — refatorar para receber `payments: PaymentRow[]` (já carregados no AdminPage) e construir a série MRR somando `amount_cents` dos pagamentos agrupados por mês. Remove o hardcode e o problema de status.
2. **`src/pages/AdminPage.tsx`**:
   - Passar `payments` para `<GrowthCharts/>`.
   - Substituir o cálculo do card "A Receber (Mês)" por: `Σ(price_cents do plano ativo da org) / ciclo` para todas as orgs `subscription_status='active'` e `subscription_plan != 'free'`. Buscar preços de `platform_plans` no `useEffect` de load.
3. **Validar:** abrir /admin no preview, conferir que os 3 KPIs do topo mostram valores diferentes e que o gráfico "MRR por Mês" bate com o card "MRR".

Mudanças escopadas só a UI/leitura — sem migrações, sem mexer em RLS, sem tocar em fluxo de venda/impressão.