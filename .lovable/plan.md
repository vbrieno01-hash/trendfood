

## Plano: Seção de Relatórios no Painel do Administrador

### Visão geral
Adicionar uma nova aba "Relatórios" no painel admin com filtro por período (data início/fim), total faturado, tabela de pedidos e exportação em PDF/CSV. O documento serve como comprovante de faturamento.

### Mudanças

| Arquivo | Mudança |
|---------|---------|
| `src/components/admin/AdminReportsTab.tsx` | **Novo** — Componente com: seletor de data início/fim, cards de KPI (total faturado, qtd pedidos), tabela com ID do pedido, data/hora, nome da loja, valor total, método de pagamento. Botões de exportar PDF e CSV |
| `src/pages/AdminPage.tsx` | Adicionar item "Relatórios" (`relatorios`) no NAV_GROUPS sob "Gestão" e renderizar o componente na área de conteúdo |

### Layout da aba

```text
┌─────────────────────────────────────────────┐
│  📊 Relatório de Faturamento                │
│                                             │
│  De: [__/__/____]  Até: [__/__/____]  [🔍]  │
│                                             │
│  ┌──────────┐  ┌──────────┐                 │
│  │ R$12.450 │  │ 87       │                 │
│  │ Total    │  │ Pedidos  │                 │
│  └──────────┘  └──────────┘                 │
│                                             │
│  [Exportar CSV]  [Exportar PDF]             │
│                                             │
│  # │ Pedido  │ Loja   │ Data    │ Valor │Pgto│
│  1 │ #42     │ Burger │ 03/04   │ R$85  │PIX │
│  2 │ #41     │ Pizza  │ 02/04   │ R$120 │$   │
│  ...                                        │
└─────────────────────────────────────────────┘
```

### Detalhes técnicos
- Busca todos os pedidos de todas as orgs via `supabase.from("orders")` com `order_items` e join com `organizations` para nome da loja
- Filtra por `created_at` entre as datas selecionadas
- Valor total = soma de `price * quantity` dos `order_items`
- Método de pagamento extraído do campo `payment_method` do pedido
- CSV inclui BOM UTF-8 para compatibilidade com Excel
- PDF abre em nova janela com `window.print()` (mesmo padrão do ReportsTab existente)
- Documento inclui cabeçalho "TrendFood — Relatório de Faturamento" com período e data de emissão

