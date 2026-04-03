

## Plano: Resumo por Meio de Pagamento no topo (junto aos KPIs)

### Mudança no arquivo `src/components/dashboard/ReportsTab.tsx`

Adicionar uma seção de **cards de resumo por meio de pagamento** logo abaixo dos 4 KPI cards (linha ~515), antes do Comparativo Semanal. Reutiliza o `paymentStats` já calculado.

### Layout

```text
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Faturamento │ │ Ticket Médio│ │ Tot Pedidos │ │ Pedidos/dia │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘

┌──────────────────────────────────────────────────────────────┐
│  💳 Resumo por Meio de Pagamento                             │
│                                                              │
│  🟢 PIX           R$ 8.500,00  (52%)                        │
│  🟡 Dinheiro      R$ 2.015,32  (12%)                        │
│  🔵 Crédito       R$ 5.300,00  (32%)                        │
│  🟣 Débito        R$ 600,00    (4%)                         │
└──────────────────────────────────────────────────────────────┘

[Comparativo Semanal]
[Gráficos...]
```

### Detalhes
- Apenas 1 arquivo editado: `src/components/dashboard/ReportsTab.tsx`
- Reutiliza o `paymentStats` existente (linhas 192-210) — zero lógica nova
- Cada método de pagamento exibido como uma linha com bolinha colorida, nome, valor formatado em BRL e percentual
- Card estilizado com `dashboard-glass` consistente com os KPI cards existentes
- A seção de pagamento detalhada que já existe mais abaixo (com gráfico de barras) permanece no lugar

