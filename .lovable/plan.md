

## Plano — Landing rápida no celular (sem perder o efeito no desktop)

A landing tá lenta porque **muito efeito caro tá rodando em mobile** ao mesmo tempo. Cada `useScroll` do framer-motion adiciona um listener e recalcula transforms a cada scroll — você tem **6 deles ativos simultaneamente**. Junte isso com 28 partículas animadas, parallax de imagem, tilts 3D e gradientes blur-3xl, e o celular trava.

### Diagnóstico (390x844, mobile real)

| Componente | Custo no mobile | O que dá pra cortar |
|---|---|---|
| **HeroCinematic** | Parallax `useScroll` na imagem + 28 partículas com keyframe + radial glow 900x600 | Desligar parallax e particles em mobile, manter só o gradiente |
| **StackedProblemCards** | `useScroll` + 4 transforms por card (y, scale, opacity, rotate) × 3 cards = **12 transforms recalculados a cada pixel de scroll** | Em mobile virar fade-in simples (`whileInView`) sem scroll-linked |
| **AnimatedComparison** | `useScroll` controlando altura de barras + 2 contadores numéricos atualizando 60x/s | Em mobile mostrar barras estáticas no valor final (27% / 100%) |
| **TimelineSteps** | `useScroll` + 2 transforms por step × 4 + linha vertical animada | Em mobile virar fade-in simples; linha vertical estática |
| **MagneticFeatureCard** | 14 cards, cada um com 4 motion values + spring + radial glow seguindo mouse | Em mobile remover tilt/glow (não tem mouse) — virar card normal |
| **StickyShowcase** | Já tem fallback mobile ✅ | Sem mudança |
| **MarqueeSocialProof** | Animação CSS leve | Sem mudança |

### O que vou implementar

**1. Hook compartilhado `useIsDesktop()`** (`src/hooks/useIsDesktop.ts`)
- Retorna `window.innerWidth >= 1024` com listener de resize
- Usado por todos os componentes pesados pra desligar efeitos em mobile

**2. `HeroCinematic.tsx`**
- Em mobile: zero partículas (`Array.from({ length: 0 })`), sem parallax (`heroY`/`heroOpacity` desativados), sem `useScroll`
- Particles e parallax só renderizam em `isDesktop`

**3. `StackedProblemCards.tsx`**
- Em mobile: substituir `StackedCard` (com 4 useTransform) por card simples com `whileInView` fade-in (uma vez só)
- Em desktop: mantém o efeito 3D stacked atual

**4. `AnimatedComparison.tsx`**
- Em mobile: barras estáticas (Marketplace cheia em vermelho, TrendFood cheia em verde), sem `useScroll`, sem contadores animados
- Em desktop: mantém a animação de barras enchendo/esvaziando

**5. `TimelineSteps.tsx`**
- Em mobile: `StepCard` sem `useTransform`, só `whileInView` fade simples; linha vertical estática (cor `bg-primary/30`, sem scaleY animado)
- Em desktop: mantém tudo

**6. `MagneticFeatureCard.tsx`**
- Em mobile: nada de tilt 3D nem glow seguindo mouse (não existe mouse no toque); só fade-in com delay
- Em desktop: mantém efeito magnético

**7. CSS bonus (`src/index.css`)**
- Adicionar `@media (max-width: 1023px)` que reduz `blur-3xl` pra `blur-xl` em divs de glow (blur grande é assassino de GPU mobile)

### Resultado

- **Desktop**: idêntico ao atual, todo o efeito cinematográfico preservado
- **Mobile**: rolagem fluida 60fps, fade-ins suaves no lugar dos efeitos scroll-linked pesados, mantendo a hierarquia visual (gradientes, badges, mockup do hero, marquee)
- Sem perder nada de conteúdo, só remover efeito invisível ou caro demais pra tela pequena
- Acessibilidade: continua respeitando `prefers-reduced-motion`

Mudança em 6 arquivos + 1 hook novo. Trabalho coeso, faço num passe.

