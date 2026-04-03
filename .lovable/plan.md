

## Plano: Garantir que o sistema de avaliações está 100% funcional

### Problemas encontrados

1. **Link de avaliação no toast não é clicável** — O toast mostra a URL como texto puro. O cliente no celular não consegue clicar nela facilmente. Precisa ser um link clicável ou usar outra abordagem.

2. **Validação de rating ausente no banco** — Não há CHECK constraint nem validação no frontend além de `rating === 0`. Um valor fora de 1-5 poderia ser inserido via API.

### Correções

**1. Tornar o link de avaliação clicável no toast**
- Trocar o `description` de string para um elemento JSX com um `<a>` clicável apontando para `/avaliar/${slug}/${order.id}`
- Texto: "Avalie seu pedido →" como link clicável

**2. Adicionar validação de rating no frontend**
- No `ReviewPage.tsx`, o `handleSubmit` já verifica `rating === 0`. Isso está OK.
- No `useSubmitReview`, adicionar guard `if (rating < 1 || rating > 5)` antes do insert.

**3. Adicionar CHECK constraint via trigger (preventivo)**
- Criar um validation trigger na tabela `reviews` para garantir `rating BETWEEN 1 AND 5` no banco.

### Arquivos modificados
| Arquivo | Mudança |
|---------|---------|
| `src/pages/UnitPage.tsx` | Toast com link clicável em vez de URL como texto |
| `src/hooks/useReviews.ts` | Guard de validação no `useSubmitReview` |
| Migração SQL | Trigger de validação para rating 1-5 |

