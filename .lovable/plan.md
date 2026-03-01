

## Plano: Card "Economia Total" na aba Ganhe Desconto

### O que será feito
Adicionar um terceiro card de estatística no `ReferralSection` que mostra quanto o usuário economizou em R$ com base nos dias de bônus acumulados, proporcional ao valor da mensalidade do plano atual.

### Cálculo
- Buscar o `price_cents` do plano atual do usuário na tabela `platform_plans`
- Valor diário = `price_cents / 30`
- Economia = `totalDays * (price_cents / 30)` convertido para R$
- Se plano for `free`, usar o valor do plano Pro como referência (pois é o plano que o bônus estende)

### Alteração em `src/components/dashboard/ReferralSection.tsx`
1. Receber `subscriptionPlan` como prop (ou buscar do contexto)
2. Fazer query na `platform_plans` para obter o `price_cents` do plano
3. Adicionar terceiro card no grid (mudar de `grid-cols-2` para `grid-cols-3`) com:
   - Ícone de moedas (`DollarSign` ou `Coins` do Lucide) em amarelo/dourado
   - Valor formatado como `R$ XX,XX`
   - Label "economia total"
4. Abaixo do grid de stats, frase de incentivo: "Continue indicando para zerar sua mensalidade!"

### Detalhes visuais
- Ícone: `BadgeDollarSign` com fundo amarelo/amber
- Grid responsivo: `grid-cols-2 sm:grid-cols-3` para não quebrar em mobile
- Frase de incentivo em texto pequeno, centralizada, cor primary

