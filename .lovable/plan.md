## Objetivo
Fazer o carrossel de lojas voltar a rodar em loop automático sem perder o arraste livre, e validar isso no preview antes de te dar a confirmação.

## O que vou implementar
1. Ajustar a lógica de pausa/retomada do `TopStoresMarquee` para o auto-scroll não ficar preso em estado pausado.
2. Garantir que o loop infinito continue suave depois de mouse hover, touch, wheel e drag manual.
3. Preservar o comportamento atual pedido por você: por padrão mostrar só logo + nome da loja, com arraste livre funcionando.
4. Validar no preview com teste real:
   - observar movimento automático após alguns segundos;
   - arrastar manualmente o carrossel;
   - confirmar que ele retoma sozinho e continua em loop.

## Diagnóstico encontrado
- O componente `TopStoresMarquee` hoje usa `requestAnimationFrame` com `scrollLeft` e um estado de pausa via `pausedRef`.
- A lógica atual pausa em vários eventos (`mouseenter`, `touchstart`, `wheel`, `pointerdown`) e agenda retomada por timer.
- O sintoma mais provável é a retomada ficar inconsistente por conflito entre eventos de interação e o sincronismo de `scrollLeft`, então o loop não reaparece de forma confiável.

## Arquivo principal
- `src/components/landing/TopStoresMarquee.tsx`

## Critério de pronto
- O carrossel se move sozinho sem intervenção.
- O usuário consegue arrastar livremente.
- Após soltar, o carrossel volta sozinho em pouco tempo.
- Não há clique acidental ao arrastar.
- O comportamento é confirmado visualmente no preview antes de eu te responder como concluído.

## Detalhes técnicos
- Centralizar a retomada automática em uma única rotina confiável.
- Sincronizar a posição interna do loop com o `scrollLeft` real após interações.
- Revisar os eventos que hoje pausam o loop para evitar travamento permanente em mobile/desktop.
- Revalidar no preview com captura após espera e teste manual de interação.