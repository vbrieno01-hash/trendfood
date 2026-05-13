## Objetivo

Aumentar a recompensa do programa de indicação:
- **Plano Mensal pago pelo amigo** → +30 dias (1 mês) para quem indicou (hoje: +10)
- **Plano Anual pago pelo amigo** → +90 dias (3 meses) para quem indicou (hoje: +30)
- **Plano Trimestral** (existe no mp-webhook) → +45 dias, mantendo a proporção (hoje: +15)

## Pontos de alteração

### 1. Backend — onde o bônus é calculado e creditado
Todos os locais que decidem `bonusDays` precisam usar a nova tabela:

- `supabase/functions/mp-webhook/index.ts` (linha 93)
  `annual ? 30 : quarterly ? 15 : 10` → `annual ? 90 : quarterly ? 45 : 30`
- `supabase/functions/universal-activation-webhook/index.ts` (linha 34)
  `annual ? 30 : 10` → `annual ? 90 : 30`
- `src/pages/AdminPage.tsx` → `processReferralBonusClient` (linha ~119)
  `annual ? 30 : 10` → `annual ? 90 : 30`
- `src/components/admin/ManageSubscriptionDialog.tsx` (ativação manual pelo admin, linhas ~136 e ~150)
  - `bonus_days: 10` → calcular pelo `billing_cycle` da org ativada (annual=90, quarterly=45, default=30)
  - `+ 10 * 24*60*60*1000` → usar a mesma variável `bonusDays`
  - mensagem do log de ativação atualizada para `+${bonusDays} dias`

Sem alterações de schema. `referral_bonuses.bonus_days` já guarda o número real, então bônus antigos continuam exibindo o valor que foi efetivamente creditado.

### 2. Frontend — UI da aba "Ganhe Desconto"
`src/components/dashboard/ReferralSection.tsx`:
- Card "Sua Recompensa":
  - "+10 dias" → **"+1 mês"** com sublinha "(30 dias grátis)"
  - "+30 dias" → **"+3 meses"** com sublinha "(90 dias grátis)"
- Atualizar o texto do passo 3 e a frase final do card para reforçar "ganha meses grátis".
- Histórico de bônus mantém a exibição em dias (vem do banco), mas para entradas novas vai aparecer "+30 dias" / "+90 dias" naturalmente.

### 3. Sem mudanças
- Nenhum impacto em `affiliates` / `affiliate_commissions` (sistema separado, paga em R$).
- Nenhuma mudança em RLS, schema, edge function configs ou cron jobs.

## Plano de testes (executados antes de declarar pronto)

1. **Grep de cobertura** — após editar, rodar `rg "bonus_days|bonusDays|annual ? 30 : 10|annual ? 30 : quarterly"` para garantir que nenhum local antigo ficou para trás.
2. **Build TypeScript** — verificar que compila sem erros (executado pelo harness automaticamente).
3. **Teste unitário da regra de cálculo** — escrever um pequeno script `node` em `/tmp` que importa/replica a função `bonusFor(cycle)` e valida:
   - `bonusFor("annual") === 90`
   - `bonusFor("quarterly") === 45`
   - `bonusFor("monthly") === 30`
   - `bonusFor(undefined) === 30`
4. **Inspeção dos 4 arquivos backend** — re-leitura final confirmando que cada um aplica a mesma tabela de valores.
5. **Verificação de banco (read-only via psql)** — `SELECT bonus_days, count(*) FROM referral_bonuses GROUP BY 1;` para confirmar que os valores históricos continuam preservados (o ajuste é só para novas conversões).
6. **Smoke test do componente** — abrir a aba `/dashboard?tab=referral` no preview e conferir visualmente os números "+1 mês" e "+3 meses".

## Observações

- Bônus já creditados no passado ficam como estão (10/30 dias). A mudança vale para conversões futuras a partir do deploy das Edge Functions (deploy automático).
- O cálculo de "economia total" no card de stats usa `totalDays * (priceCents / 30)`, então continua coerente — quando um amigo novo pagar mensal, o stat saltará +1 mensalidade inteira.