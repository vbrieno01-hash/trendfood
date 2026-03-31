

## Plano: Contador ao vivo de pedidos na página inicial

### O que será feito
Adicionar um contador animado na hero section mostrando o total de pedidos do sistema em tempo real. O número atualiza automaticamente via realtime subscription.

### Implementação

**1. `src/pages/Index.tsx`**

- Adicionar estado `orderCount` e buscar o total com `SELECT count(*) FROM orders` via Supabase no mount
- Assinar canal realtime na tabela `orders` (evento `INSERT`) para incrementar o contador a cada novo pedido
- Renderizar o contador entre os proof badges e o CTA, ou logo abaixo do subtítulo, com animação de contagem (incremento gradual)
- Formato: `🔥 +12.345 pedidos feitos no TrendFood` com animação de número subindo

**2. Componente de animação**
- Usar um efeito simples de `useEffect` que anima o número de 0 até o valor real usando `requestAnimationFrame` ou `setInterval` com easing
- Formatar com separador de milhar (`toLocaleString('pt-BR')`)

**3. Realtime**
- A tabela `orders` já tem RLS com SELECT público, então a subscription funciona
- Já está no `supabase_realtime` publication (verificar, senão adicionar via migração)

### Posição na página
Logo abaixo dos proof badges (linha ~289), como uma linha centralizada com destaque visual sutil.

### Arquivos alterados
- `src/pages/Index.tsx` (estado + fetch + realtime + render do contador)
- Possível migração: `ALTER PUBLICATION supabase_realtime ADD TABLE public.orders` (se ainda não estiver)

