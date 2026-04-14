

## Unificar Cozinha & Gestão em 3 colunas no Desktop

### O que muda
Remover as abas Cozinha/Gestão no desktop e mostrar as 3 seções lado a lado como colunas visíveis:

```text
┌─────────────────┬──────────────────┬──────────────────┐
│  🔥 Pendentes   │  ✅ Prontos p/   │  💰 Aguardando   │
│  (Cozinha)      │    Entrega       │    Pagamento     │
│                 │                  │                  │
│  cards...       │  cards...        │  cards...        │
└─────────────────┴──────────────────┴──────────────────┘
```

No mobile, as 3 seções ficam empilhadas verticalmente (comportamento atual mantido).

### Arquivos alterados

**`src/components/dashboard/OperationsTab.tsx`**
- Substituir o componente de Tabs por um layout `grid grid-cols-1 lg:grid-cols-3`
- Cada coluna renderiza sua seção diretamente (sem abas)
- Coluna 1: Pedidos pendentes/preparando (conteúdo do KitchenTab)
- Coluna 2: Prontos para Entrega (seção do WaiterTab)
- Coluna 3: Aguardando Pagamento (seção do WaiterTab)

**`src/components/dashboard/KitchenTab.tsx`**
- Adicionar prop `compact?: boolean` para renderizar apenas a lista de pedidos sem controles duplicados (auto-print, notificações) quando embedded no grid

**`src/components/dashboard/WaiterTab.tsx`**
- Extrair as seções "Prontos para Entrega" e "Aguardando Pagamento" como componentes separados exportáveis, ou adicionar prop para renderizar seções individualmente

### Detalhes técnicos
- Desktop (lg+): `grid-cols-3` com gap e cada coluna com scroll independente (`max-h-[calc(100vh-200px)] overflow-y-auto`)
- Mobile: `grid-cols-1` empilhado, mantém experiência atual
- Controles operacionais (auto-print, notificações) ficam acima do grid, compartilhados
- Badge "ao vivo" fica no header geral, não duplicado por coluna

