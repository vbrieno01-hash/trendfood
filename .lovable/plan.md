
# Seção "Veja o Sistema em Ação" com Mockups Reais

## O que foi capturado

Tirei dois prints reais do sistema agora mesmo:

**Dashboard (desktop 1280px)** — mostra:
- Sidebar vermelha com logo TrendFood, nome "Burguer do Rei", navegação
- Card grande vermelho "Faturamento Hoje: R$ 880,00 | 15 pedidos pagos"
- 4 cards de métricas: Faturamento total, Pedidos hoje, Aguardando pagamento, Ticket médio
- Gráfico "Últimos 7 dias" com barras vermelhas e linha verde de faturamento

**Cardápio público (mobile 390px)** — mostra:
- Header com logo e "Burguer do Rei"
- Abas "Cardápio / Sugestões"
- Categorias com chips (Hambúrgueres, Porções)
- Card de produto com foto, nome, descrição e botão "+ Adicionar"

---

## Nova Seção a Ser Adicionada

Vai entrar entre "Como funciona" (linha 271) e "Features" (linha 273) do `Index.tsx`, com fundo branco/card limpo.

### Layout Desktop (3 colunas)

```text
┌──────────────────────────────────────────────────────────────┐
│       "Veja o sistema em ação"                               │
│   Uma maneira simples de gerenciar e vender mais             │
│                                                              │
│  [Painel de     [  🖥️ MOCKUP LAPTOP CSS   📱 ]  [Cardápio   │
│   Gestão]       [  sidebar + revenue dash  ]   Digital]     │
│  badge red      [  + mobile sobrepost dir. ]  badge red      │
│                 [                          ]                 │
│  → R$ 880,00    [                          ]  → Clientes     │
│  ao vivo no     [                          ]  pedem pelo     │
│  painel...      [                          ]  celular...     │
└──────────────────────────────────────────────────────────────┘
```

### Mockup do Dashboard (laptop CSS, fiel ao print)

Construído 100% em HTML/Tailwind — sem imagens externas, sem carregamento lento:

- Moldura de laptop: bordas arredondadas, barra topo cinza com 3 bolinhas (macOS-style)
- **Sidebar** esquerda (fundo escuro): Logo TrendFood (ícone vermelho + texto), "Burguer do Rei", itens de nav (Home ativo em vermelho, Cardápio, Mesas, Cozinha, Garçom)
- **Conteúdo principal**: Card grande vermelho "Faturamento Hoje — R$ 880,00", 2 cards de métricas (Faturamento total, Pedidos hoje), mini-gráfico de barras estilizado

### Mockup do Celular (iPhone CSS, fiel ao print)

Posicionado sobre o canto inferior direito do laptop:

- Frame de celular com notch/barra de status
- Header com logo e "Burguer do Rei"
- Chip de categoria "🍔 Hambúrgueres"
- Card de produto com área de imagem, nome "Duplo cheddar", preço "R$ 36,00", botão "+ Adicionar" preto

### Textos laterais (fiel ao estilo da imagem de referência)

**Esquerda:**
- Badge vermelho: "Painel de Gestão"
- Título: "Seus números em tempo real"
- Texto: "Acompanhe o faturamento do dia, ticket médio e pedidos pagos direto no painel. Tudo atualizado ao vivo, sem precisar recarregar."
- Seta SVG curva →

**Direita:**
- Badge vermelho: "Cardápio Digital"
- Título: "Seus clientes pedem pelo celular"
- Texto: "Cardápio bonito, responsivo e sem app. O cliente acessa pelo QR Code da mesa e faz o pedido em segundos."
- Seta SVG curva ←

### Responsividade

- **Desktop**: layout 3 colunas (texto | mockups | texto), mockup laptop com ~500px de largura
- **Mobile**: empilhado — texto superior, mockup laptop (largura 100%), mockup celular centralizado abaixo, texto inferior

---

## Arquivo Afetado

| Arquivo | Ação |
|---|---|
| `src/pages/Index.tsx` | Inserir nova `<section>` entre linha 271 e 272 |

Sem banco de dados, sem novos arquivos — apenas HTML/CSS/Tailwind dentro do Index.tsx existente.
