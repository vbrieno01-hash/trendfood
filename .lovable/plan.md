

## Plano: Corrigir plural de "pontos" no badge de fidelidade

### Problema
O badge exibe "1 pontos" quando deveria ser "1 ponto" (singular).

### Mudança
No `src/pages/UnitPage.tsx`, na linha do badge de fidelidade (~linha 1191), alterar o texto para usar singular/plural corretamente:

```
{loyaltyPointsData.points} {loyaltyPointsData.points === 1 ? "ponto" : "pontos"}
```

### Arquivo modificado
| Arquivo | Mudança |
|---------|---------|
| `src/pages/UnitPage.tsx` | Corrigir plural no badge de fidelidade |

