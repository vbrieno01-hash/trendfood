
# Corrigir tabela de comparacao no mobile

## Problema
No mobile, a tabela comparativa fica com colunas muito apertadas, os badges ("Incluso", "Gratis") sao cortados na borda direita, e o conteudo fica amontoado.

## Solucao

### Arquivo: `src/components/landing/ComparisonSection.tsx`

Ajustar o layout para mobile com as seguintes mudancas:

1. **No mobile, empilhar cada linha em formato de card** em vez de manter 3 colunas apertadas
   - Em telas pequenas: cada item vira um card com o label em cima e as duas colunas (Marketplace vs TrendFood) embaixo, lado a lado
   - Em telas maiores (md+): manter a tabela de 3 colunas como esta

2. **Detalhes do layout mobile (< md)**:
   - Cada row vira um bloco com o label como titulo
   - Abaixo, dois blocos lado a lado: um vermelho (marketplace) e um verde (TrendFood)
   - Badges ficam abaixo do texto, sem cortar

3. **Detalhes do layout desktop (md+)**:
   - Manter exatamente como esta, apenas ajustar as proporcoes das colunas para dar mais espaco a coluna TrendFood: usar `grid-cols-[1fr_1.2fr_1.3fr]` em vez de `grid-cols-3` iguais

4. **Reducao de padding no mobile**: `p-3` em vez de `p-4` para ganhar espaco

Isso resolve o corte dos badges e a sobreposicao dos icones sem alterar o visual no desktop.
