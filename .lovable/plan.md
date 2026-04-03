

## Plano: Adicionar Fidelidade na FeaturesTab como recurso Pro

### Mudanças

| # | Arquivo | O que |
|---|---------|-------|
| 1 | `src/components/dashboard/FeaturesTab.tsx` | Adicionar item "Programa de Fidelidade" na lista `FEATURES` com `minPlan: "pro"`, ícone `Heart` (ou `Gift`), status `"available"` |
| 2 | `src/hooks/usePlanLimits.ts` | Adicionar `"loyalty"` ao tipo `Feature` e configurar acesso: `free: false`, `pro: true`, `enterprise: true`, `lifetime: true` |

### Detalhes
- Título: "Programa de Fidelidade"
- Descrição: "Sistema de pontos por compra. Clientes acumulam pontos e trocam por descontos automaticamente."
- Plano mínimo: Pro
- 2 arquivos editados, nenhum arquivo novo

