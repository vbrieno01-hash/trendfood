

## Plano: Card do plano atual com aparência desabilitada (incluindo Grátis)

### Problema
Atualmente só o **botão** fica com `opacity-60` quando é o plano atual. O card inteiro continua com aparência normal, o que não deixa claro visualmente que aquele plano já está ativo. Isso precisa valer para **todos** os planos, incluindo o Grátis (que é o padrão após criar conta ou após reembolso/cancelamento).

### Correção

**Arquivo: `src/components/pricing/PlanCard.tsx`**
- Adicionar `opacity-60 pointer-events-none` no container do card (`<div>`) quando `currentPlan` é `true`
- Isso faz o card inteiro ficar semi-transparente e não-interativo
- O botão "Plano atual" continua desabilitado como já está
- Manter o badge "Seu plano" e o `ring-2 ring-primary` para identificação visual

### Resultado esperado
- Plano Grátis: card transparente + botão "Plano atual" desabilitado quando o lojista está no free
- Plano Pro/Enterprise: mesma aparência quando ativo
- Após reembolso/cancelamento: volta para free e o card Grátis fica com essa aparência automaticamente

