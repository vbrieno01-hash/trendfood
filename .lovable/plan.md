## Problema

No mobile, o `UpgradeDialog` (usado em todas as abas/menu hambúrguer) mostra os planos em coluna única (`grid-cols-1`). O card Pro tem ~14 features listadas + botão grande, ocupando toda a tela — o usuário não percebe que existe um card Enterprise logo abaixo (precisa rolar bastante).

## Solução proposta (somente UI, mobile)

Editar `src/components/dashboard/UpgradeDialog.tsx` e `src/components/pricing/PlanCard.tsx`:

1. **Seletor de plano no topo (mobile only)**: adicionar pílulas "Pro / Enterprise" acima dos cards no mobile (`<sm`), funcionando como âncora que faz scroll suave até o card escolhido. No desktop continua mostrando os 2 lado a lado.

2. **Indicador visual "+1 plano abaixo"**: um chip flutuante discreto ("↓ Ver Enterprise") aparece no canto inferior do card Pro enquanto o Enterprise não está visível na viewport (IntersectionObserver). Some quando o Enterprise entra na tela.

3. **Lista de features colapsável no mobile**: no `PlanCard`, quando `window` for mobile, mostrar as 5 primeiras features e um botão "Ver todos os X recursos" para expandir. Isso encurta o card Pro e o Enterprise aparece mais cedo no scroll.

4. **Garantir que o `DialogContent` use `max-h-[90vh] overflow-y-auto`** (já está) e adicionar `scroll-smooth` para o âncora funcionar bem.

Nada de alterar preços, lógica de cobrança ou planos.

## Resposta à dúvida do cliente — débito automático em cartão de débito

A cobrança recorrente do TrendFood é feita pelo **Mercado Pago** usando o token de cartão salvo na assinatura. O Mercado Pago **só faz débito recorrente automático em cartão de crédito** (a fatura é gerada todo mês e debitada no cartão salvo).

Cartão de **débito puro não é aceito** para assinaturas recorrentes — o MP exige cartão de crédito porque precisa autorizar o valor com antecedência. Alternativas que funcionam para o cliente:
- Cartão de crédito (debita todo mês automaticamente)
- PIX recorrente (cobrança gerada automática, mas o cliente precisa pagar o QR Code todo mês — não é "automático" como cartão)

Se for cartão múltiplo (débito+crédito), ele precisa marcar a opção crédito na hora de cadastrar.

## Arquivos a editar

- `src/components/dashboard/UpgradeDialog.tsx` — seletor mobile + observer para chip
- `src/components/pricing/PlanCard.tsx` — features colapsáveis no mobile