## Por que o "Lojas em destaque" sumiu

Investiguei e a seção existe (`TopStoresMarquee` em `src/pages/Index.tsx`), mas está caindo no fallback (`MarqueeSocialProof`). Motivo:

- A view `top_stores_showcase` (usada pela RPC `get_top_stores_showcase`) só retorna lojas com:
  - logo preenchido
  - `paused = false`
  - **>= 5 pedidos pagos nos últimos 30 dias**
- Hoje só passam **2 lojas**: WrBurg (78) e GBflix (65).
- O componente exige **>= 3 lojas** (`if (stores.length < 3) return <MarqueeSocialProof />`), então renderiza o fallback genérico em vez do marquee real.
- Bônus: a loja mais ativa do sistema, **Rei do Burguer (691 pedidos)**, está com `paused = true` e por isso é excluída.

## Correção proposta

### 1. Baixar o piso para mostrar o marquee
- `src/components/landing/TopStoresMarquee.tsx`: trocar `stores.length < 3` por `stores.length < 2`. Com 2 lojas reais já dá pra rodar o marquee com loop suave (o código duplica o grupo, então fica visualmente ok).

### 2. Afrouxar o critério da view para popular melhor
Criar migration que recria `top_stores_showcase` com:
- `HAVING count(ord.id) >= 3` (em vez de 5) — ainda exige tração mínima real.
- Manter exclusão de `paused = true` e exigência de logo (lojas pausadas não devem ser anunciadas; isso é correto).
- Manter `LIMIT 15` e ordenação por pedidos pagos nos últimos 30 dias.

Com isso passam a aparecer: WrBurg, GBflix e `lanchonetedopastor` (3 pagos) — 3 lojas, marquee fica natural.

### 3. (Opcional, recomendado) Fallback inteligente quando só 1 loja qualifica
Se em algum momento só houver 1 loja elegível, manter o fallback atual (`MarqueeSocialProof`). Nenhuma mudança extra necessária além do passo 1.

## O que NÃO vou fazer
- Não vou incluir lojas pausadas (Rei do Burguer continua de fora enquanto estiver pausado — correto do ponto de vista de UX).
- Não vou mexer no visual do marquee, no header, nem em outros componentes da landing.
- Não vou tocar em nada de banners (assunto separado já resolvido).

## Arquivos afetados
- `src/components/landing/TopStoresMarquee.tsx` (1 linha)
- Nova migration recriando a view `top_stores_showcase` (threshold 5 → 3)
