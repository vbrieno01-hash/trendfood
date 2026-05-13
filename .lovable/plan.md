# Plano: Acelerar a abertura da página

## Diagnóstico
A landing (`/`) está pesada porque:

1. **Todas as rotas são importadas estáticas** em `src/App.tsx` (só `DashboardPage` é lazy). Isso joga Admin, Dashboard, Kitchen, Waiter, Pricing, Courier, Docs etc. no bundle inicial mesmo quem só abriu a home.
2. **Index importa 8 componentes pesados de landing eagerly**, todos usando `framer-motion` (HeroCinematic, StackedProblemCards, TimelineSteps, StickyShowcase, AnimatedComparison, MagneticFeatureCard, SavingsCalculator, MarqueeSocialProof) — só o hero precisa renderizar antes do scroll.
3. **`dashboard-screenshot.png` (278 KB)** é a imagem hero — fica grande demais em PNG; em WebP cai pra ~70-90 KB.
4. **Sem code-splitting de vendor** no `vite.config.ts` — `framer-motion`, `recharts`, `@supabase/*` e `@tanstack/react-query` ficam todos no mesmo chunk gigante.

## O que vou fazer

### 1. Lazy-load das rotas em `src/App.tsx`
Manter eager apenas `Index` (homepage) e `NotFound`. Tudo o resto vira `React.lazy(...)` com um `<Suspense>` único envolvendo `<Routes>` (spinner já existente).

### 2. Lazy-load das seções below-the-fold no `src/pages/Index.tsx`
Manter eager apenas `HeroCinematic` (above-the-fold). Os demais (`MarqueeSocialProof`, `StackedProblemCards`, `TimelineSteps`, `StickyShowcase`, `AnimatedComparison`, `MagneticFeatureCard`, `SavingsCalculator`) viram `lazy()` com `<Suspense fallback={null}>`. Como já são abaixo da dobra, o usuário não percebe carregamento.

### 3. Converter o hero para WebP
Gerar `src/assets/dashboard-screenshot.webp` a partir do PNG (sharp/squoosh) e trocar o import em `HeroCinematic.tsx` e `StickyShowcase.tsx`. Mantém o `width/height/fetchpriority="high"` que já existem.

### 4. Code-splitting de vendor no `vite.config.ts`
Adicionar `build.rollupOptions.output.manualChunks` separando:
- `react-vendor`: react, react-dom, react-router-dom
- `motion`: framer-motion
- `supabase`: @supabase/*
- `query`: @tanstack/react-query
- `charts`: recharts (só carregado em rotas que usam)

## Detalhes técnicos
- Suspense fallback global das rotas reusa o spinner já usado pra Dashboard.
- Suspense fallback das seções de landing é `null` (zero CLS — as seções aparecem conforme o scroll, sem skeletons).
- A conversão WebP é feita com `nix run nixpkgs#libwebp -- cwebp -q 82` (qualidade 82 mantém visual idêntico para screenshot).
- Não mexo em lógica de negócio, hooks, autenticação, dados ou design — só split de bundle e formato de imagem.

## Fora de escopo
- Não vou converter outras imagens grandes (`anuncio-30-itens.png`, `banner-*.png`, `trendfood-*.png`) porque elas não estão importadas pela landing/hero.
- Não mexo no SEO/OG/Schema já corrigidos.
- Não mexo na lógica de Dashboard, KDS, etc.

## Resultado esperado
- Bundle inicial cai de ~vários MB para ~300-500 KB.
- LCP da home cai significativamente (menos JS a parsear + hero em WebP).
- Rotas internas (Dashboard, Kitchen, Admin) carregam só quando acessadas.
