

## Plano: Gráfico de faturamento diário por método de pagamento na Home

### Contexto
Os pedidos já possuem o campo `payment_method` (valores como "dinheiro", "pix", "cartao", "credito", "debito", etc). O gráfico será adicionado abaixo do gráfico existente de "Últimos 7 dias".

### Implementação

**Arquivo: `src/components/dashboard/HomeTab.tsx`**

1. Criar uma função `classifyPayment(method: string)` que agrupa os métodos em 3 categorias:
   - **Dinheiro**: `"dinheiro"`, `"pending"`, vazio/null
   - **PIX**: `"pix"`
   - **Cartao**: `"cartao"`, `"credito"`, `"debito"`, `"credit_card"`

2. Gerar dados dos últimos 7 dias com breakdown por categoria: para cada dia, somar o faturamento (itens × preço × quantidade) dos pedidos pagos, agrupando por categoria de pagamento.

3. Adicionar um novo `<Card>` com um `BarChart` empilhado (stacked) usando Recharts:
   - Eixo X: dias da semana
   - Eixo Y: faturamento em R$
   - 3 barras empilhadas: Dinheiro (verde), PIX (azul), Cartao (roxo)
   - Tooltip formatado em BRL
   - Legenda

### Detalhes visuais
- Cores: Dinheiro `#22c55e`, PIX `#3b82f6`, Cartao `#8b5cf6`
- Barras com `radius` arredondado no topo
- Mesmo estilo visual dos cards existentes (border-border, shadow-sm)
- Título: "Faturamento por Método de Pagamento"
- Subtítulo com total do período

