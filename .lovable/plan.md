
## Diagnóstico da queixa "coloquei preto com azul e ficou vermelho"

Confirmei o que está acontecendo: a UI do dashboard **separou as cores corretamente**, MAS a vitrine pública (`UnitPage.tsx` + `ItemDetailDrawer.tsx`) **ignora** o campo "Cor dos preços e destaques" — todos os preços continuam usando `primaryColor` (a cor laranja/vermelha principal da loja).

Resultado: você muda "cor de destaque" pra azul → salva → abre a loja → preços continuam laranja/vermelho da cor primária. Dá impressão de que "nada funciona" ou que "ficou na cor errada".

### Onde está o furo (linhas exatas)

| Arquivo | Linha | O que está hoje | Devia ser |
|---|---|---|---|
| `src/pages/UnitPage.tsx` | 1106 | `style={{ color: primaryColor }}` no preço do card | `accentTextColor` |
| `src/components/unit/ItemDetailDrawer.tsx` | 103 | `style={{ color: primaryColor }}` no preço grande | `accentTextColor` |

E provavelmente mais alguns: badge "no carrinho", total no carrinho, preço do adicional no drawer. Vou auditar tudo.

### O que NÃO mudar (tem que continuar usando `primaryColor`)

Esses elementos são "ações/identidade da marca", não "texto de destaque" — e devem continuar na cor principal:

- Botão "+" no card e no carrinho
- Pill da categoria ativa
- Badge de quantidade no canto do produto
- Borda esquerda do card de status da loja
- Botão flutuante "Ver carrinho"
- Borda do tipo de pedido selecionado
- Ícone do carrinho no header do drawer

Só **textos de preço e tags de destaque** trocam pra `accentTextColor`.

## Plano de correção

### 1. `src/pages/UnitPage.tsx` — usar `accentTextColor` nos preços

- Linha 1106: preço dentro do card de produto → `color: accentTextColor`
- Auditar e trocar também: preço total do carrinho, subtotal, valores de adicionais exibidos como "destaque" (não os botões)

### 2. `src/components/unit/ItemDetailDrawer.tsx` — receber e usar `accentTextColor`

- Adicionar prop `accentColor` no componente
- Linha 103: preço grande do item → usa `accentColor`
- Preço dos adicionais (se exibido como número de destaque) → usa `accentColor`
- Passar `accentTextColor` do `UnitPage` na hora de renderizar o drawer

### 3. Garantir que mini-preview do dashboard continue batendo com a realidade

O mini-preview "R$ 19,90" do dashboard já mostra com `accent_text_color` em fundo branco (igual o card real). Depois da correção, **o que o lojista vê no preview vai ser exatamente o que aparece na loja** — fim do efeito "mudei e nada aconteceu".

### 4. Validação visual pós-correção

Lojista abre `/unidade/[slug]` e:
- Preço dos cards = `accent_text_color` ✅
- Botão "+" continua na `primary_color` ✅
- Nome da loja no banner usa `header_text_color` ✅ (já está funcionando)
- Gradiente do banner usa `gradient_color` ✅ (já está funcionando)

## Arquivos a editar

- `src/pages/UnitPage.tsx` — substituir `primaryColor` por `accentTextColor` apenas nos elementos de **texto/preço de destaque** (linha 1106 + auditar carrinho)
- `src/components/unit/ItemDetailDrawer.tsx` — adicionar prop `accentColor` e usar nos preços (linha 103)

## Resultado esperado

Você muda "Cor dos preços e destaques" pra azul → salva → abre a loja → **todos os preços ficam azuis**. A cor primária (laranja/vermelho) continua só nos botões e detalhes de marca. Cada cor faz exatamente o que o nome diz.
