

## Plano: Adicionar resumo por meio de pagamento nos exports (CSV e PDF/PNG)

### Mudança no arquivo `src/components/dashboard/ReportsTab.tsx`

**1. CSV** — Após o cabeçalho da loja e antes da tabela de pedidos, inserir um bloco de resumo:
```text
Resumo por Meio de Pagamento
PIX;45 pedidos;R$ 8.500,00;52%
Dinheiro;20 pedidos;R$ 2.015,32;12%
...
(linha em branco)
Pedido;Data;Valor;Pagamento;Status
```

Usa o `paymentStats` já calculado para gerar as linhas.

**2. PDF/PNG (`buildReportHtml`)** — Mover a seção "Faturamento por Meio de Pagamento" para logo após os KPIs (antes do Comparativo Semanal), espelhando o layout da tela. Atualmente está após o Ranking; basta reordenar o bloco HTML na linha 326 para ficar entre os KPIs (linha 316) e o Comparativo Semanal (linha 318).

### Detalhes
- Apenas 1 arquivo editado
- Zero lógica nova — reutiliza `paymentStats` existente
- O resumo fica visível no topo do documento exportado, facilitando conferência bancária

