

## Plano: Melhorias de UX para o Dashboard

### Problema
O dashboard tem 20+ abas e pode parecer complexo para novos lojistas. O guia está escondido, falta busca rápida e a Home é passiva (só mostra dados, não guia ações).

### Mudanças propostas (por prioridade)

| # | Melhoria | Impacto |
|---|----------|---------|
| 1 | **Checklist de configuração na Home** — barra de progresso "Sua loja está X% pronta" com itens como: adicionar item ao cardápio, configurar horários, adicionar WhatsApp, criar primeira mesa | Alto — dá sensação de progresso e guia o lojista |
| 2 | **Cards de ação na Home** — "3 pedidos pendentes → Ver", "Estoque baixo → Repor", "Nenhum cupom ativo → Criar" | Alto — transforma Home de dashboard passivo em central de ações |
| 3 | **Mover "Como Usar" para o topo** — mostrar como primeiro item do grupo Ajustes ou como ícone de ajuda (?) fixo no header | Médio — garante que novatos encontrem o guia |
| 4 | **Bottom navigation no mobile** — 4-5 ícones fixos no rodapé (Home, Pedidos, Cardápio, Menu) substituindo o hamburger menu | Alto — padrão mobile universal, reduz cliques |

### Arquivos afetados

- `src/components/dashboard/HomeTab.tsx` — adicionar checklist de progresso + cards de ação
- `src/pages/DashboardPage.tsx` — reordenar sidebar, adicionar bottom nav mobile
- Novo: `src/components/dashboard/SetupChecklist.tsx` — componente de checklist reutilizável

### Detalhes técnicos
- Checklist consulta dados existentes (org tem whatsapp? tem itens no cardápio? tem mesas?) para calcular progresso
- Cards de ação usam queries já existentes (useOrders, low_stock_count)
- Bottom nav mobile usa `position: fixed; bottom` com z-index acima da status bar
- Sem mudanças no banco de dados

### Resultado
- Dashboard mais convidativo para novos lojistas
- Home deixa de ser passiva e vira "centro de controle"
- Mobile mais intuitivo com navegação nativa

