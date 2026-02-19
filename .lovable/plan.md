

# Atualizar todas as organizacoes existentes para plano Free ativo

## Objetivo

Todas as lojas que ja se cadastraram devem ter `subscription_status = 'active'` e `subscription_plan = 'free'`. Isso garante que nenhuma loja tenha acesso gratuito a features Pro. Quem comprar um plano tera seu `subscription_plan` atualizado para `pro` ou `enterprise`, desbloqueando as funcionalidades correspondentes.

## O que sera feito

1. **Atualizar 6 organizacoes** que ainda estao com `subscription_status = 'trial'` para `active`:
   - Burguer Teste
   - brenotorado
   - Loja Onboarding Test
   - Lanche do Carlos Teste
   - Jubileu story
   - Ph

   (A "Burguer do Rei" ja esta como `active`.)

2. **Alterar o default do campo `subscription_status`** de `'trial'` para `'active'`, para que novas organizacoes ja comecem no plano free sem periodo de teste.

## Resultado esperado

- Todas as lojas existentes e futuras comecam no plano free com restricoes (cadeados, limites de itens/mesas)
- Somente ao comprar um plano (`subscription_plan = 'pro'` ou `'enterprise'`) as features sao desbloqueadas
- O banner de "Periodo de teste" nao aparecera mais

## Detalhes tecnicos

### 1. Atualizar dados existentes (via insert tool)

```sql
UPDATE organizations
SET subscription_status = 'active'
WHERE subscription_status = 'trial';
```

### 2. Alterar default da coluna (via migration)

```sql
ALTER TABLE organizations
ALTER COLUMN subscription_status SET DEFAULT 'active';
```

### 3. Remover logica de trial do codigo

No arquivo `src/hooks/usePlanLimits.ts`, remover a linha que concede acesso Pro a usuarios trial:

```typescript
// ANTES:
const effectivePlan: Plan = status === "trial" ? "pro" : rawPlan;

// DEPOIS:
const effectivePlan: Plan = rawPlan;
```

No `DashboardPage.tsx`, remover o banner de "Periodo de teste ativo" (se existir referencia ao status trial).

Nenhuma outra alteracao de codigo e necessaria. O fluxo de compra (quando implementado) so precisara atualizar `subscription_plan` para `'pro'` ou `'enterprise'` na organizacao.

