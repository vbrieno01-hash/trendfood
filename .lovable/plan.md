## Objetivo

Fazer o visitante da landing pensar "quero usar agora" através de:
1. **Banner fixo de oferta** no topo do hero, com urgência e CTA gigante.
2. **Carrossel infinito 100% automático** das 15 lojas com mais pedidos nos últimos 30 dias, substituindo a faixa atual de ícones genéricos (`MarqueeSocialProof`).

---

## Parte 1 — Carrossel "Lojas em destaque" (automático)

### Critérios definidos
- **Ranking:** soma de pedidos pagos (`orders.paid = true`) nos últimos 30 dias.
- **Filtro mínimo:** loja precisa ter **logo** (`organizations.logo_url IS NOT NULL`) **e ≥ 5 pedidos** no período.
- **Top:** 15 lojas. Ordenação desc por contagem.
- **Atualização:** automática via `pg_cron` a cada 1h. Se uma loja nova ultrapassar a 15ª, ela toma o lugar — sem intervenção manual.

### Banco de dados (migration)

1. Criar **view materializada** `top_stores_showcase` que retorna `id, slug, name, logo_url, order_count_30d` das top 15 lojas que atendem os filtros.
2. Criar índice `UNIQUE` em `id` (necessário pra `REFRESH CONCURRENTLY`).
3. Criar função `refresh_top_stores_showcase()` que executa `REFRESH MATERIALIZED VIEW CONCURRENTLY` + grava em `cron_health` pra ficar visível no watchdog admin.
4. Política RLS na view: `SELECT` público (logo + nome de loja já são públicos via `/unidade/[slug]`).
5. Agendar `pg_cron`: `'refresh-top-stores-showcase'` a cada hora.

### Frontend

- Novo componente `src/components/landing/TopStoresMarquee.tsx`:
  - Faz `supabase.from('top_stores_showcase').select('*')` (cache `staleTime: 10min`).
  - Renderiza marquee infinito (mesmo padrão visual do `MarqueeSocialProof`: gradiente lateral, animação `landing-marquee-track`, `hover:[animation-play-state:paused]`).
  - Cada item: logo redonda 48px + nome da loja embaixo, em chip glassmorphism. Clique abre `/unidade/[slug]` em nova aba.
  - Fallback elegante se < 3 lojas elegíveis: usa o `MarqueeSocialProof` antigo.
- Substituir `<MarqueeSocialProof />` por `<TopStoresMarquee />` em `src/pages/Index.tsx` (manter o componente antigo no projeto como fallback).

---

## Parte 2 — Banner de oferta + urgência no hero

### Componente novo
`src/components/landing/HeroOfferBanner.tsx`:
- Faixa logo abaixo da nav (acima do hero atual `HeroCinematic`).
- Conteúdo: "🔥 7 dias Pro grátis + 30 dias bônus se indicar 1 amigo" + CTA "Começar agora →" + selo "Sem cartão".
- Visual: gradiente laranja vibrante (`from-primary` to `--primary-glow`), texto branco, micro-animação de pulse no badge.
- Dismissible? **Não** — ele é a oferta principal, fica fixo. (Se quiser dismissible depois, dá pra adicionar.)
- Mobile-first: empilha CTA embaixo no `< sm`.
- Clique no CTA → `/auth?mode=signup`.

### Integração
- Adicionar no topo de `src/pages/Index.tsx`, antes do `<HeroCinematic />`.

---

## Fora do escopo
- Não vou mexer no `HeroCinematic` em si (só adicionar banner acima).
- Não vou criar landing dedicada de afiliados.
- Não vou mexer no comparativo, calculadora, depoimentos.

---

## Detalhes técnicos

```text
src/pages/Index.tsx
  ├── <HeroOfferBanner />          ← novo
  ├── <HeroCinematic />            ← inalterado
  ├── <TopStoresMarquee />         ← novo (substitui MarqueeSocialProof)
  └── ...resto inalterado

DB:
  - MATERIALIZED VIEW top_stores_showcase
  - FUNCTION refresh_top_stores_showcase()
  - pg_cron job 'refresh-top-stores-showcase' (hourly)
  - cron_health entry pra monitorar (já cobertO pelo watchdog existente)
```

Pronto pra implementar quando você aprovar.