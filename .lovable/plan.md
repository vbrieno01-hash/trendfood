

## Plano: Adicionar label "Avaliações" na pill de estrelas

### Mudança
Adicionar o texto "Avaliações" antes das estrelas no componente `StoreReviews.tsx` para dar contexto ao significado das estrelas.

### Resultado visual
```text
Avaliações ★★★★★ 5.0 (1)
```

### Arquivo modificado
| Arquivo | Mudança |
|---------|---------|
| `src/components/unit/StoreReviews.tsx` | Adicionar `<span>Avaliações</span>` antes das estrelas dentro da pill |

