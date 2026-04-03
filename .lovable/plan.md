

## Plano: Mover aba Avaliações do Financeiro para o Operacional

### Mudança
Mover a linha `{ key: "reviews", ... label: "Avaliações" }` do grupo **FINANCEIRO** (linha 538) para o grupo **OPERACIONAL** (após "Histórico", linha 520).

### Arquivo modificado
| Arquivo | Mudança |
|---------|---------|
| `src/pages/DashboardPage.tsx` | Remover "reviews" do array `financeiro.items` e adicionar ao final de `operacional.items` |

