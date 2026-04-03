

## Plano: Remover comentários da vitrine pública — mostrar só estrelas

### Mudança
No componente `src/components/unit/StoreReviews.tsx`, remover a exibição de comentários e nomes de clientes na lista expandida. Manter apenas as estrelas, data e a média no resumo.

### Arquivo modificado
| Arquivo | Mudança |
|---------|---------|
| `src/components/unit/StoreReviews.tsx` | Remover `review.comment` e `review.customer_name` da renderização dos cards de avaliação |

