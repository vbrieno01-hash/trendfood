

## Plano — Barras animadas que não travam no meio

### O bug

Na screenshot atual aparece **"12% TAXA" / "57% PRA VOCÊ"** — esses números não fazem sentido (a mensagem real é 27% pro marketplace, 100% pra você). Eles são **valores intermediários** porque a animação está amarrada ao scroll: quando você para de rolar, ela congela em qualquer ponto da curva.

Pior ainda: a barra Marketplace está animando do jeito **invertido** (começa cheia, esvazia até 12%) — exatamente o oposto do que comunica a mensagem (Marketplace TIRA 27% de você).

### Correção

**`src/components/landing/AnimatedComparison.tsx`** — trocar scroll-linked por `whileInView` único:

1. **Remover** `useScroll` e os 4 `useTransform` (marketplaceHeight, trendHeight, marketplacePct, trendPct).
2. **Remover** o gate `isDesktop` das barras — agora desktop e mobile usam a mesma animação simples e segura.
3. **Trocar** as barras por `motion.div` com:
   - Marketplace: `initial={{ height: "0%" }}` → `whileInView={{ height: "27%" }}` (cresce até 27%, comunica "eles tomam 27%")
   - TrendFood: `initial={{ height: "0%" }}` → `whileInView={{ height: "100%" }}` (cresce até 100%)
   - `viewport={{ once: true, margin: "-20%" }}` — anima uma vez quando entra na tela
   - `transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}`
4. **Trocar** os contadores numéricos por contagem com `whileInView` usando um `motion.span` animado de 0 → valor final via `useMotionValue` + `animate` (ou simplesmente exibir o número final estático após `0.6s` de delay com fade).
   - Solução mais limpa: componente `<CountUp from={0} to={27} />` usando `useMotionValue` + `animate()` no `useEffect` disparado por `whileInView` (via `useInView`).

### Resultado

- Barras **sempre terminam nos valores corretos** (27% / 100%), em qualquer posição de scroll.
- Animação dispara uma vez ao entrar na viewport, não fica refém do scroll.
- Mensagem coerente: Marketplace cresce até 27% (vermelho) representando "o que eles tiram"; TrendFood cresce até 100% (verde) representando "o que fica com você".
- Mesma animação em mobile e desktop (já era estática em mobile, agora vira animada em todos os tamanhos com custo zero — `whileInView` não tem listener de scroll contínuo).

### Arquivo

- `src/components/landing/AnimatedComparison.tsx`

