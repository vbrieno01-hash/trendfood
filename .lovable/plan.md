

## Plano: Guia de Ajuda com Ilustrações Visuais + Novas Seções

### Abordagem para os "prints com setas"

Como não temos screenshots reais do app para usar, vou criar **mini-ilustrações em HTML/CSS** para cada seção que simulam a interface real do sistema. Cada ilustração terá:
- Um mini-mockup estilizado da tela em questão (cards, botões, menus)
- Setas animadas (usando CSS + ícones Lucide `ArrowRight`, `ArrowDown`, `MousePointerClick`) apontando para o elemento que o usuário deve clicar
- Labels explicativos ao lado das setas ("Clique aqui", "Toque neste botão")
- Visual com borda arredondada e fundo claro, parecendo um "print" anotado

### Estrutura técnica

**Arquivo**: `src/components/dashboard/GuideTab.tsx` — reescrever completamente

1. **Novo componente `GuideMockup`** — renderiza mini-mockups HTML/CSS de cada tela com setas e anotações visuais
2. **Cada seção ganha 1-2 ilustrações** embutidas no accordion, entre a descrição e o passo a passo
3. **As ilustrações usam**:
   - Div estilizada com `border`, `rounded-xl`, `shadow-sm`, `bg-muted/30` simulando uma "janela"
   - Elementos internos representando botões, cards, inputs reais do app
   - Ícone `MousePointerClick` ou `ArrowRight` com animação `animate-bounce` posicionado sobre o elemento alvo
   - Texto de anotação em vermelho/primary ao lado da seta

### Seções existentes (11) + 2 novas = 13 seções, ~15 ilustrações

Cada seção terá pelo menos 1 mockup visual. Seções mais complexas terão 2.

| Seção | Mockups |
|-------|---------|
| Home | 1 — cards de métricas com seta nos atalhos rápidos |
| Meu Cardápio | 2 — lista de itens + botão adicionar; modal de edição |
| **Adicionais** (NOVO) | 2 — seção de adicionais no modal; visão do cliente no drawer |
| Mesas | 1 — lista de mesas + botão QR Code |
| Histórico | 1 — filtros de data + lista de pedidos |
| Cupons | 1 — formulário de criação de cupom |
| Mais Vendidos | 1 — ranking de vendas |
| Cozinha/KDS | 1 — cards de pedidos com botões de status |
| Garçom | 1 — pedidos por mesa |
| Caixa | 1 — botão abrir/fechar caixa |
| **Frete/Entrega** (NOVO) | 1 — configuração de faixas de frete |
| Perfil da Loja | 1 — formulário de perfil |
| Configurações | 1 — tela de configurações com Pix e cor |

### Detalhes de implementação

- Criar um componente `GuideMockup` que recebe `children` e renderiza dentro de um frame estilizado como "screenshot"
- Criar um componente `GuideArrow` que mostra seta animada + label
- Cada mockup é feito com divs e ícones Lucide, sem imagens externas
- Adicionar seção "Adicionais / Complementos" com ícone `Plus` e badge Pro
- Adicionar seção "Frete e Entrega" com ícone `Truck` explicando a configuração de faixas de preço por km

### Arquivo alterado
- `src/components/dashboard/GuideTab.tsx` — reescrita completa

