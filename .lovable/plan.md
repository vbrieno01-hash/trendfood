

## Plano: Criar UpgradeDialog modal inline no dashboard

### O que será feito
Transformar o botão "Fazer upgrade" do `UpgradePrompt` para abrir um modal bonito dentro do dashboard, mostrando os planos disponíveis com checkout integrado, em vez de redirecionar para `/planos`.

### Implementação

**1. Criar componente `UpgradeDialog.tsx`** (`src/components/dashboard/UpgradeDialog.tsx`)
- Modal usando `Dialog` do Radix
- Busca planos da tabela `platform_plans` (mesmo padrão do `SubscriptionTab`)
- Renderiza `PlanCard` para cada plano pago (Pro e Enterprise), sem mostrar o Grátis
- Ao selecionar um plano, abre o `CardPaymentForm` inline para checkout
- Recebe `open`, `onOpenChange`, `orgId`, e `currentPlan` como props

**2. Atualizar `UpgradePrompt.tsx`**
- Remover o `<Link to="/planos">` do botão
- Adicionar estado `dialogOpen` e renderizar o `UpgradeDialog`
- Receber `orgId` e `currentPlan` como props adicionais
- O botão "Fazer upgrade" agora abre o dialog

**3. Atualizar chamadas ao `UpgradePrompt`**
- Nos locais que usam `UpgradePrompt` (DashboardPage, MenuTab, etc.), passar `orgId` e `currentPlan` como props

### Detalhes técnicos
- Reutiliza `PlanCard` e `CardPaymentForm` já existentes
- Busca de planos via `supabase.from("platform_plans")` igual ao `SubscriptionTab`
- O dialog terá layout compacto com grid de 2 colunas para os planos pagos
- Após sucesso no pagamento, faz `window.location.reload()` para atualizar permissões

