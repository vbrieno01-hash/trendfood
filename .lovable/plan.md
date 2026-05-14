## Objetivo
Mover **iFood** e **Robô IA** para os planos pagos (Pro e Enterprise), mantendo eles liberados durante os **7 dias de teste Pro**. Hoje os dois ficam abertos no Free, então toda loja Free os usa indefinidamente.

## Como vai funcionar
- Loja **Free pura** (sem trial ativo): iFood e Robô IA aparecem na sidebar com cadeado e abrem uma tela de upgrade (mesmo padrão de Caixa, Relatórios, Cupons, etc.).
- Loja em **trial de 7 dias**: liberados normalmente (já hoje o trial vira “effectivePlan = pro”, então a trava automaticamente respeita).
- Loja **Pro / Enterprise / Lifetime ativos**: liberados normalmente.
- Loja **paga expirada** (volta pra free): bloqueia, igual o resto das features pagas.

## O que vou alterar
1. `src/hooks/usePlanLimits.ts`
   - Adicionar a feature `ifood` (já existe `ai_bot`).
   - Free → `false`. Pro / Enterprise / Lifetime → `true`.

2. `src/pages/DashboardPage.tsx`
   - Incluir `ifood` e `aibot` no `lockedFeatures`.
   - Marcar os dois itens da seção INTEGRAÇÕES com `locked` (cadeado na sidebar).
   - No render do conteúdo, mostrar a tela de bloqueio/upgrade quando travado, em vez do `<IFoodTab />` / `<AIBotTab />`.

3. Banco — `platform_plans` (descrição dos planos exibida no dashboard e na landing)
   - Adicionar “Integração iFood” e “Robô IA (vendas WhatsApp)” na lista de features do plano Pro, para o usuário enxergar que faz parte do pago.

## Critérios de pronto
- Numa conta Free pura, iFood e Robô IA aparecem com cadeado e clicar leva pra upgrade.
- Numa conta com trial Pro ativo, os dois funcionam normalmente.
- Numa conta Pro/Enterprise paga, os dois funcionam normalmente.
- A descrição do plano Pro (dashboard e landing) lista iFood e Robô IA.
- Validação no preview antes de eu marcar como concluído.

## Detalhes técnicos
- O `effectivePlan` em `usePlanLimits` já promove trial Free para `pro`, então não precisa de lógica especial pro trial — basta usar `canAccess`.
- Backend não precisa de migração de schema — só atualização do JSON `features` na tabela `platform_plans`.
- A trava é de UX/gate de plano. Se quiser endurecer no servidor depois (ex.: bloquear o webhook do iFood pra Free), entra como passo separado, fora desse plano.