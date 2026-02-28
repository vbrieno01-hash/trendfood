

## Resultado da Verificação: Botão de Upgrade no UpgradePrompt

### O que existe hoje

O `UpgradePrompt` **não é um modal/janelinha** — é um **card estático** que substitui o conteúdo da aba bloqueada. Ele contém:
- Icone de cadeado
- Titulo e descrição da feature bloqueada
- Botão "Fazer upgrade" que **navega para `/planos`** (a página de preços)

### Fluxo atual ao clicar "Fazer upgrade"
1. Usuário vê o card com cadeado no lugar da aba (ex: Estoque)
2. Clica em "Fazer upgrade"
3. É redirecionado para `/planos` (PricingPage)
4. Escolhe um plano → abre AlertDialog de confirmação → CardPaymentForm

### Limitação do teste
A loja TrendFood está no plano **Enterprise**, portanto as travas não aparecem visualmente. Para testar, seria necessário alterar temporariamente o plano no banco de dados para "free".

### Possível melhoria (opcional)
Se o desejo é que o botão de upgrade abra uma **janelinha/modal bonita** dentro do próprio dashboard (em vez de redirecionar para `/planos`), seria necessário:

1. Criar um `UpgradeDialog` — modal (Dialog) com os planos disponíveis e botão de assinar
2. Atualizar o `UpgradePrompt` para abrir o dialog ao invés de navegar para `/planos`
3. Integrar o `CardPaymentForm` dentro do dialog para checkout inline

### Recomendação
O fluxo atual (redirecionar para `/planos`) já funciona bem e é consistente. A melhoria de modal inline é opcional.

**Para testar visualmente as travas**, posso alterar temporariamente o plano da TrendFood para "free" no banco, tirar screenshots, e restaurar para "enterprise".

