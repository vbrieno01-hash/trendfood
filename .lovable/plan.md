# Carrossel "Lojas em destaque" — maior + loop realmente infinito

## Problemas identificados

1. **Logos pequenas demais** no mobile (atualmente 40×40px, nome em `text-sm`).
2. **Loop com "salto"**: a animação termina e reinicia visivelmente em vez de fluir contínuo.
   - Causa: usa 3 cópias com `translate -33.333%`, mas com `gap-6` no flex, o gap entre a última e a primeira cópia desalinha o ponto de retorno → visualmente "pula".
   - Em mobile com poucas lojas (hoje 4), 12s é rápido demais e o reset fica óbvio.

## Mudanças (apenas frontend, em `TopStoresMarquee.tsx` + `index.css`)

### 1. Logos e cards maiores
- Logo: `w-10 h-10` → **`w-16 h-16`** (mobile) e **`md:w-20 md:h-20`** (desktop).
- Card: padding `px-4 py-2.5` → `px-5 py-3`, raio `rounded-2xl` → `rounded-3xl`.
- Nome da loja: `text-sm` → **`text-base md:text-lg`** + `font-bold`, `max-w-[160px]` → `max-w-[200px]`.
- Pequeno chip extra abaixo do nome: "X pedidos / 30d" em `text-[10px] text-muted-foreground` (reforça prova social, opcional mas recomendo).
- Gap entre cards: `gap-6` → `gap-4 md:gap-6`.

### 2. Loop verdadeiramente infinito
- Trocar abordagem de "triplicar e translate -33.33%" por **duplicar e translate -50%**, que é o padrão sem salto.
- O track passa a ser um wrapper com **dois grupos idênticos** (`<div className="marquee-group">…stores…</div>` × 2), ambos com `gap` interno. Isso elimina o gap "extra" entre cópias que causava o jump.
- Atualizar keyframe:
  ```css
  @keyframes landing-marquee {
    from { transform: translate3d(0, 0, 0); }
    to   { transform: translate3d(-50%, 0, 0); }
  }
  ```
- Adicionar `min-w-max` em cada grupo e `gap` apenas dentro do grupo (gap entre grupos vem do mesmo flex parent com `gap` igual, então alinha).

### 3. Velocidade adequada
- Animação `12s` → **`40s` linear infinite** (com mais conteúdo visível, precisa ser mais lenta para parecer suave).
- Manter `prefers-reduced-motion` desativando.

### 4. Fallback de poucas lojas
- Hoje exige ≥3 lojas. Manter, mas quando tiver 3-5 lojas, a duplicação garante que o marquee preencha a largura mesmo em desktop largo.

## Fora do escopo
- Não mexer no ranking, na view materializada nem no cron.
- Não mexer no `HeroOfferBanner`.
- Não tocar em `MarqueeSocialProof` (fallback continua igual).

## Arquivos
- `src/components/landing/TopStoresMarquee.tsx` — refatorar markup (2 grupos), aumentar tamanhos.
- `src/index.css` — ajustar keyframe `landing-marquee` para `-50%` e duração para `40s`.
