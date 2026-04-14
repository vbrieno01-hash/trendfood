

## Adicionar "Balcão" no rodapé mobile do Dashboard

### O que será feito

Adicionar o item **Balcão** na barra de navegação inferior (mobile) do dashboard, junto com os outros itens (Home, Pedidos, Cardápio, Mesas, Histórico).

### Mudança

**Arquivo: `src/pages/DashboardPage.tsx`** (linhas 1070-1075)

Adicionar um novo item no array da nav inferior:
- `{ key: "counter", icon: <ShoppingCart className="w-5 h-5" />, label: "Balcão" }`

Será inserido entre "Mesas" e "Histórico" (ou no final, conforme melhor fluxo). O grid passará de 5 para 6 itens — o layout `justify-around` já distribui automaticamente.

