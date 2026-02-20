

# Adicionar opcao "Vitalicio" no painel Admin

## Resumo

Adicionar a opcao "Vitalicio" ao seletor de planos no painel Admin. O plano vitalicio funciona como Enterprise sem cobranca recorrente -- o admin escolhe qual loja recebe esse status.

## Mudancas

### 1. `src/pages/AdminPage.tsx`

- Adicionar `{ value: "lifetime", label: "Vitalicio" }` ao array `PLAN_OPTIONS` (linha 63-67)
- No badge de plano do `StoreCard` (linha 756-762), adicionar tratamento para `"lifetime"` com estilo dourado (ex: `bg-yellow-500/15 text-yellow-700`)
- No calculo de KPIs (linhas 218-221), **nao** contar lojas vitalicio como assinantes pagantes no MRR (ja que nao geram receita recorrente)
- No `subscriberDetails` (linhas 230-239), excluir lojas vitalicio do calculo de receita ou mostrar valor zero
- Na tabela de detalhamento de assinantes, se incluir vitalicio, mostrar "Vitalicio" como plano e R$ 0 como valor mensal

### 2. `src/hooks/usePlanLimits.ts`

- Adicionar `"lifetime"` ao type `Plan`
- Adicionar entrada em `FEATURE_ACCESS` para `lifetime` com todas as features liberadas (igual Enterprise)
- Tratar `effectivePlan`: quando `rawPlan === "lifetime"`, mapear para acesso completo (sem limites de itens/mesas)

### 3. Impacto no banco de dados

Nenhuma migracao necessaria -- o campo `subscription_plan` ja e `text` e aceita qualquer valor.

### Detalhes tecnicos

- O plano vitalicio tera acesso identico ao Enterprise (todas features, sem limites)
- Ele nao sera contabilizado no MRR nem na receita estimada
- O badge no card da loja tera cor dourada para diferenciar visualmente
- Os webhooks Cakto (pro/enterprise) nao sao afetados pois vitalicio so e atribuido manualmente pelo admin

