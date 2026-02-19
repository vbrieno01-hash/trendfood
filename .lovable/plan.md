
# Redesign do Painel Admin — Profissional e Organizado

## O que muda

- **Remove** a seção "Tabela Global de Frete" (cada loja define o seu)
- **Redesenha** completamente o layout para um painel de controle profissional estilo SaaS
- Adiciona métricas de topo (KPIs) com cards de resumo da plataforma
- Troca a lista simples por um **grid de cards** com dados ricos por loja

---

## Nova estrutura visual

### Header
Barra superior escura com logo TrendFood, título "Painel Administrativo" e badge com nome do admin logado.

### KPIs — 4 cards de métricas no topo
```text
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  5 Lojas     │  │ 50 Pedidos   │  │ R$ 21.047    │  │  3 c/ Endereço│
│  Cadastradas │  │  na plataforma│  │  Faturamento │  │  Configuradas│
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

### Grid de cards de lojas
Cada loja vira um card com:
- Avatar/inicial colorida do nome da loja
- Nome + slug (com link clicável para abrir a loja pública)
- Badge de status (Trial / Ativo)
- Badge de endereço (Configurado / Pendente)
- Métricas: itens no cardápio, total de pedidos, faturamento total
- Data de cadastro
- Ícone de acesso externo para abrir a loja

```text
┌─────────────────────────────────────────┐
│ [B]  Burguer do Rei          [Trial] [↗]│
│      /unidade/burguer-do-rei             │
│  ──────────────────────────────────────  │
│  3 itens   48 pedidos   R$ 20.826,00    │
│  Endereço configurado   Desde 18/02/26  │
└─────────────────────────────────────────┘
```

---

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/pages/AdminPage.tsx` | Reescrita completa: remove frete, adiciona KPIs, cards grid |

---

## Detalhes técnicos

### Dados carregados no AdminContent
Além do SELECT básico já existente, adicionar um JOIN para trazer:
- `menu_items_count` — quantidade de itens no cardápio
- `orders_count` — total de pedidos
- `total_revenue` — faturamento total (SUM de order_items.price * quantity)

Isso é feito via chamadas separadas ao Supabase que já funcionam com as RLS existentes (SELECT público em todas as tabelas).

### KPIs calculados em memória (client-side)
- Total de lojas = `orgs.length`
- Total de pedidos = soma de `orders_count` de cada org
- Faturamento total = soma de `total_revenue` de cada org
- Lojas com endereço = `orgs.filter(o => o.store_address).length`

### Paleta de cores dos avatares
Gerada deterministicamente a partir do nome da loja, usando um array de 8 cores (azul, verde, roxo, laranja, etc.) para que cada loja sempre tenha a mesma cor.

### Responsividade
- Mobile: 1 coluna
- Tablet: 2 colunas
- Desktop: 3 colunas (grid)
