## Objetivo
Fazer o carrossel “Lojas em destaque agora” voltar a andar sozinho sem depender do usuário arrastar, mantendo o arraste livre e o loop contínuo.

## O que vou fazer
1. Revisar a lógica de animação do `TopStoresMarquee` para eliminar o estado em que ele monta parado.
2. Remover a dependência que hoje pode estar bloqueando o auto-scroll no preview (`prefers-reduced-motion`) e garantir um estado inicial de movimento confiável.
3. Manter o drag manual, o pause curto após interação e a retomada automática do loop.
4. Validar no preview antes de encerrar: abrir a home, observar o movimento automático, arrastar manualmente e confirmar que ele retoma sozinho.

## Critérios de pronto
- O carrossel começa a se mover sozinho sem qualquer interação.
- O usuário consegue arrastar livremente para qualquer lado.
- Após soltar, o carrossel volta a se mover sozinho em pouco tempo.
- O loop continua sem travar ou “sumir”.
- A validação é feita no preview antes de eu te confirmar a correção.

## Detalhes técnicos
- Arquivo principal: `src/components/landing/TopStoresMarquee.tsx`
- Verificação complementar: `src/index.css`
- A causa mais provável encontrada é o gate de movimento reduzido somado à lógica atual de animação, deixando o componente renderizado mas sem iniciar o auto-scroll em certas condições do preview.