
## Plano: Simplificar avaliações na vitrine — só resumo com estrelas

### Mudança
Remover a funcionalidade de expandir/colapsar e a lista individual de avaliações. Manter apenas a barra de resumo estática com as estrelas, nota média e contagem.

### Arquivo modificado
| Arquivo | Mudança |
|---------|---------|
| `src/components/unit/StoreReviews.tsx` | Remover estado `expanded`, botão de toggle, ícones chevron e bloco de lista de reviews. Manter só o `div` estático com estrelas + média + contagem |
