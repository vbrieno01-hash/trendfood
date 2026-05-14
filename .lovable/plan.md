# Carrossel arrastável + auto-scroll mantendo loop infinito

## Objetivo
Permitir que o usuário arraste/deslize o carrossel livremente (mouse e touch) sem perder o auto-scroll contínuo nem o loop infinito.

## Por que não dá só "adicionar overflow-x-auto"
Hoje o movimento vem de `transform: translateX(-50%)` via keyframe CSS. Scroll nativo (`overflow-x-auto`) não interage com `transform` — o usuário não consegue arrastar. Precisamos trocar a técnica de animação.

## Solução

Refatorar `TopStoresMarquee.tsx` para usar **scroll nativo animado por JS** em vez de keyframe CSS:

1. Container externo com `overflow-x-auto` + `scrollbar-hide` + `cursor-grab active:cursor-grabbing` + `touch-pan-x`.
2. Conteúdo: continua sendo 2 grupos idênticos lado a lado (mantém o truque do loop).
3. Substituir o keyframe `landing-marquee` por um `requestAnimationFrame` que incrementa `scrollLeft` em ~0.5px/frame (≈ 30px/s, equivalente aos 40s atuais).
4. Quando `scrollLeft >= primeiroGrupo.offsetWidth`, subtrai a largura do primeiro grupo (loop invisível — usuário nem percebe).
5. **Pausa o auto-scroll** quando o usuário:
   - faz `pointerdown` / `touchstart` / `wheel` no container
   - passa o mouse por cima (`mouseenter`)
6. **Retoma o auto-scroll** após 2s de inatividade (`pointerup`/`touchend` + timer).
7. Drag livre com mouse: handlers `pointerdown` → captura `startX` e `scrollLeft`, `pointermove` ajusta `scrollLeft`, `pointerup` solta. Touch funciona nativamente via `overflow-x-auto`.
8. Respeitar `prefers-reduced-motion`: não auto-scrolla, mas continua arrastável.

## CSS
- Adicionar utilitário `.scrollbar-hide` em `index.css` (esconde barra em todos os browsers).
- Remover/manter o keyframe `landing-marquee` (manter para o `MarqueeSocialProof` fallback que ainda o usa).

## Fora do escopo
- Nada de mudança em ranking, banco, edge functions, ou outros componentes.
- Não mexer no `MarqueeSocialProof` fallback.

## Arquivo
- `src/components/landing/TopStoresMarquee.tsx` — reescrita do mecanismo de animação + handlers de drag.
- `src/index.css` — adicionar `.scrollbar-hide`.
