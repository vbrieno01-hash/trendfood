## Implementação — Top 10 lojas com selo de pausada

Banco já atualizado (materialized view recriada para top 10 all-time + função `get_top_stores_showcase` agora retorna `paused` e `order_count_total`).

Falta só ajustar o componente:

**`src/components/landing/TopStoresMarquee.tsx`:**
- Trocar tipo `order_count_30d` → `paused: boolean` + `order_count_total: number`.
- Adicionar selo "Temporariamente fechada" (chip vermelho discreto abaixo do nome) quando `store.paused`.
- Aplicar `opacity-60 grayscale` na logo das lojas pausadas.
- Ajustar tooltip pra refletir total de pedidos e estado.

Sem mudanças em outros arquivos.