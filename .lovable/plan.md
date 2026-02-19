
# Trial Pro de 7 dias para novas lojas

## Resumo

Toda loja que se cadastrar ganha automaticamente 7 dias de acesso ao plano Pro. Ao expirar, volta para o plano Free (tudo com cadeado). Um banner avisara o lojista sobre os dias restantes e, quando expirar, uma notificacao clara de que o periodo acabou.

## O que muda no banco de dados

1. **Nova coluna `trial_ends_at`** na tabela `organizations` -- armazena a data de expiracao do trial (7 dias apos o cadastro)
2. **Novas lojas** terao `subscription_plan = 'free'` e `trial_ends_at = now() + 7 days` por padrao
3. **Lojas existentes** nao serao afetadas (ficam sem trial, plano free normal)

## Logica do trial no frontend

No hook `usePlanLimits`, a logica sera:

```text
Se trial_ends_at existe E ainda nao expirou:
  -> effectivePlan = "pro" (acesso total)
  -> trialActive = true
  -> trialDaysLeft = dias restantes

Se trial_ends_at existe E ja expirou:
  -> effectivePlan = rawPlan (free)
  -> trialExpired = true

Se trial_ends_at nao existe:
  -> effectivePlan = rawPlan (comportamento atual)
```

## Interface com o usuario

### Durante o trial (banner no topo do dashboard)
- Banner com icone de foguete/estrela
- Texto: "Voce tem X dias restantes do Pro gratis"
- Botao: "Assinar plano Pro"

### Trial expirado (banner de aviso)
- Banner com icone de alerta
- Texto: "Seu periodo de teste Pro expirou. Faca upgrade para continuar usando todos os recursos."
- Botao: "Fazer upgrade"
- Todas as features Pro ficam com cadeado (comportamento atual do plano free)

## Arquivos que serao modificados

1. **Migration SQL** -- adicionar coluna `trial_ends_at` com default `now() + interval '7 days'`
2. **`src/hooks/usePlanLimits.ts`** -- adicionar campo `trial_ends_at` no `OrgLike`, calcular `trialActive`, `trialExpired`, `trialDaysLeft`, e ajustar `effectivePlan`
3. **`src/hooks/useOrganization.ts`** -- adicionar `trial_ends_at` na interface `Organization`
4. **`src/pages/DashboardPage.tsx`** -- adicionar banner de trial ativo e banner de trial expirado no topo do conteudo principal
5. **`src/hooks/useAuth.tsx`** -- garantir que `trial_ends_at` esta disponivel no objeto organization

## Detalhes tecnicos

### Migration SQL

```sql
ALTER TABLE organizations
ADD COLUMN trial_ends_at timestamptz DEFAULT (now() + interval '7 days');

-- Lojas existentes: remover trial (ja estao no free definitivo)
UPDATE organizations SET trial_ends_at = NULL;
```

Isso garante que apenas novas lojas (criadas apos a migration) terao o trial de 7 dias. Lojas existentes ficam com `trial_ends_at = NULL` (sem trial).

### usePlanLimits atualizado

O hook recebera `trial_ends_at` do objeto da organizacao e calculara:
- Se `trial_ends_at` e futuro: `effectivePlan = "pro"`, expoe `trialDaysLeft`
- Se `trial_ends_at` e passado: `effectivePlan = rawPlan`, expoe `trialExpired = true`
- Se `trial_ends_at` e null: comportamento normal sem trial

### Banner no DashboardPage

Dois banners condicionais:
- **Trial ativo**: gradiente azul/roxo, mostra dias restantes, botao para assinar
- **Trial expirado**: gradiente vermelho/laranja, aviso de expiracao, botao de upgrade
