

## Automação de Recompensa por Indicação

### Resumo
Quando uma organização indicada faz seu primeiro pagamento (muda para plano pago), o indicador ganha +10 dias de assinatura e um registro de histórico aparece no dashboard.

### 1. Nova tabela `referral_bonuses`

```sql
CREATE TABLE public.referral_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  referred_org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bonus_days integer NOT NULL DEFAULT 10,
  referred_org_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_bonuses ENABLE ROW LEVEL SECURITY;
-- Owner pode ver seus próprios bônus
-- Admin pode ver todos
-- Service role insere (via webhook)
```

RLS policies: SELECT para owner (`referrer_org_id` pertence ao user), SELECT para admin, INSERT service (true).

### 2. Lógica no `mp-webhook`

No trecho onde a org é ativada (subscription_preapproval `authorized` e pagamentos aprovados), adicionar após a ativação:

- Buscar `referred_by_id` da org recém-ativada.
- Verificar se já existe um `referral_bonuses` para esse par (evitar duplicatas).
- Se não existe: inserir em `referral_bonuses` e adicionar +10 dias ao `trial_ends_at` da org indicadora.
- Tentar adiar `next_payment_date` na API do MP se a org indicadora tiver `mp_subscription_id` (PUT na preapproval com `next_payment_date` + 10 dias). Se falhar, apenas logar — não é bloqueante.

### 3. Dashboard do lojista (`ReferralSection.tsx`)

Adicionar seção "Bônus recebidos" abaixo do contador de indicados:
- Query `referral_bonuses` onde `referrer_org_id = orgId`, ordenado por `created_at desc`.
- Exibir lista: "Você ganhou 10 dias por indicar a **Lanchonete X**!" com data.
- Card com total de dias ganhos.

### 4. Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| Migração SQL | Criar tabela `referral_bonuses` + RLS |
| `supabase/functions/mp-webhook/index.ts` | Lógica de bônus após ativação |
| `src/components/dashboard/ReferralSection.tsx` | Exibir histórico de bônus |

### Detalhes Técnicos

- A verificação de duplicidade usa `referrer_org_id + referred_org_id` como par único (constraint UNIQUE).
- O adiamento da cobrança no MP usa `PUT /preapproval/{id}` com campo `next_payment_date`. É best-effort — se a API falhar, o bônus local é mantido.
- O campo `trial_ends_at` da memória do sistema é a coluna usada para expiração, então somar 10 dias nela é suficiente.

