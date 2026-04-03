

## Plano: Exibir período exato com datas no relatório

### Problema
Quando o lojista seleciona "30 dias", o relatório mostra apenas "30 dias" tanto na tela quanto nos exports. Para declaração fiscal, ele precisa ver as datas exatas: "Período: 01/03/2026 a 31/03/2026".

### Mudança

**Arquivo:** `src/components/dashboard/ReportsTab.tsx`

**1. Atualizar `periodLabel`** (linha 212) para sempre incluir as datas reais:
- Para "7d", "30d", "90d": calcular a data de início (hoje - N dias) e mostrar `"01/03/2026 a 31/03/2026 (30 dias)"`
- Para "custom": já mostra as datas, manter como está
- Isso afeta automaticamente a tela, o CSV, o PDF e o PNG, pois todos usam `periodLabel`

**2. Adicionar linha de período visível na tela** abaixo do subtítulo "Análise completa..." (linha 404), exibindo `"Período: 01/03/2026 a 31/03/2026"` para que o lojista veja claramente o intervalo selecionado.

### Resultado
- Na tela: `Período: 01/03/2026 a 31/03/2026`
- No CSV: `Relatório: 01/03/2026 a 31/03/2026 (30 dias)`
- No PDF/PNG: `Relatório de Vendas — 01/03/2026 a 31/03/2026 (30 dias)`

### Detalhes
- Apenas 1 arquivo editado
- Zero lógica nova — só reformatar a string `periodLabel` usando `subDays(new Date(), N)` e `format()`

