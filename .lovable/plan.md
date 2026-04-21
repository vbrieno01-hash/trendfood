

## Plano — Marquee infinito de verdade, sempre rolando

A faixa já tem a estrutura de loop infinito (conteúdo duplicado + `translateX(0 → -50%)`), mas na prática parece parada por 3 motivos:

### Problemas identificados

1. **Velocidade muito lenta**: `40s linear infinite` numa tela de ~1450px faz o movimento parecer congelado (≈18px/s). Olho humano mal percebe.
2. **Pode parar com `prefers-reduced-motion`**: hoje a regra `@media (prefers-reduced-motion: reduce)` desliga 100% a animação. Em vários sistemas Windows/Mac com configurações de acessibilidade, o marquee fica estático sem o usuário saber.
3. **Apenas 2 cópias do conteúdo**: com tela ultrawide e `gap-12`, em algum momento o segundo conjunto aparece visível antes do primeiro sair — quebrando a ilusão de infinito.

### Correções

**`src/components/landing/MarqueeSocialProof.tsx`**
- Triplicar o array (`[...items, ...items, ...items]`) em vez de duplicar — garante cobertura mesmo em telas 4K e remove qualquer "salto" visível no loop.
- Adicionar `aria-hidden="true"` no track (decorativo, não precisa ser lido por screen reader).
- Pausar no hover (`hover:[animation-play-state:paused]`) — toque profissional tipo Stripe/Vercel, deixa o usuário ler o item se quiser.

**`src/index.css`**
- Velocidade de `40s` → `25s` (movimento percebido ~30px/s, suave mas visível).
- Trocar a regra de `prefers-reduced-motion`: em vez de desligar tudo, **desacelerar pra 80s** (mantém a sensação de carrossel sem ser agressivo pra usuários sensíveis a movimento). Marquees decorativos lentos são aceitáveis pelas WCAG.
- Garantir que o keyframe use `translate3d(0,0,0) → translate3d(-33.333%,0,0)` (3 cópias, então -1/3 fecha o loop perfeitamente) — `translate3d` força camada GPU, animação mais fluida.

### Resultado

- Carrossel rolando continuamente da direita pra esquerda, suave e visível.
- Loop perfeito (sem salto perceptível) em qualquer tamanho de tela.
- Pausa elegante no hover.
- Acessível: respeita reduced-motion mas não fica estático/quebrado.
- Fade nas bordas (que já existe) continua dando o efeito premium de "infinito".

Mudança mínima: 1 array triplicado + 4 linhas de CSS ajustadas.

