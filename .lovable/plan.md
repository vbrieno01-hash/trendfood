

# Corrigir: Nova unidade deve herdar o plano da org principal

## Problema

Quando um usuario Enterprise cria uma nova unidade pelo CreateUnitDialog, a nova organizacao eh inserida com `subscription_plan = 'free'` (default da coluna no banco). Isso faz o dashboard mostrar restricoes de plano gratuito e pedir upgrade novamente.

## Solucao

Alterar o `CreateUnitDialog.tsx` para copiar o `subscription_plan` da organizacao ativa ao criar a nova unidade. Como so usuarios Enterprise podem criar novas unidades (validado pelo `canAccess("multi_unit")`), a nova unidade sempre herdara o plano Enterprise.

## Mudanca tecnica

### Arquivo: `src/components/dashboard/CreateUnitDialog.tsx`

1. Adicionar uma nova prop `parentPlan` (string) ao componente
2. No `handleSave`, incluir `subscription_plan: parentPlan` no objeto de INSERT

```text
// Antes (linha ~49)
const { error } = await supabase.from("organizations").insert({
  name: name.trim(),
  slug: slug.trim(),
  user_id: userId,
  whatsapp: whatsapp.trim() || null,
});

// Depois
const { error } = await supabase.from("organizations").insert({
  name: name.trim(),
  slug: slug.trim(),
  user_id: userId,
  whatsapp: whatsapp.trim() || null,
  subscription_plan: parentPlan,
  trial_ends_at: null,
});
```

### Arquivo: `src/pages/DashboardPage.tsx`

Passar `parentPlan={organization.subscription_plan}` ao renderizar o `CreateUnitDialog`.

## Resultado

- Nova unidade criada ja nasce com plano Enterprise
- Sem trial desnecessario (trial_ends_at = null)
- Dashboard nao pede upgrade ao trocar para a nova unidade

