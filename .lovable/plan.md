

## Diagnóstico — por que ainda parece "misturado"

Olhando a sua tela do dashboard (`image-490`) e a vitrine real (`image-491`), o que está acontecendo é:

- O `accent_text_color` (campo "Cor dos preços e destaques") hoje **só é aplicado em UM lugar**: o número do preço dentro do card.
- Tudo que parece "balão" na vitrine — pílulas de categoria ("Lanches com 1 hambúrgu…"), badge "no carrinho", botão "Add", botão "Pedir agora", borda do tipo de pedido, ícone do carrinho — **continua usando `primary_color`**.
- Como você setou `primary_color = #ffffff` (branco), todos os balões viraram **branco invisível** sobre fundo claro. Aí deu a sensação de "misturou tudo, sumiu".

A raiz é conceitual: hoje só existem **2 cores de conteúdo** (`primary_color` e `accent_text_color`). Precisam virar **4 cores nomeadas e separadas**, cada uma controlando uma coisa só, sem fallback cruzado.

## Plano — separar de verdade em 4 cores, cada uma com 1 função

### As 4 cores (cada uma com nome, descrição clara e mini-preview)

| # | Nome no dashboard | Função única | Onde aparece exatamente |
|---|---|---|---|
| 1 | **Cor do cabeçalho** (`primary_color`) | Fundo do banner do topo | Faixa colorida onde fica o nome da loja |
| 2 | **Cor dos botões** (novo `button_color`) | Fundo de TODOS os botões e ícones de ação | Botão "Add", "Pedir agora", "Adicionar", ícone do carrinho, "+" do adicional, borda do tipo de pedido |
| 3 | **Cor das pílulas de categoria** (novo `category_color`) | Fundo da categoria ATIVA + badge "no carrinho" + badge de quantidade | Pill "Lanches com 1 hambúrgu…" quando selecionada, "2 no carrinho", número "3" no canto da foto |
| 4 | **Cor dos preços** (`accent_text_color`) | Cor do TEXTO de preços | "R$ 19,90" no card, "R$ 23,50" no drawer, preço dos adicionais |

Os campos auxiliares já existentes (gradiente, cor do texto do cabeçalho) continuam como estão.

### Regra de fallback (sem zumbi, sem mistura)

Se `button_color` ou `category_color` estiverem vazios → usa `primary_color`. Isso garante que lojas antigas continuam idênticas e lojistas que querem "cor única" só mexem em UMA. Quem quer separar, define cada uma e elas viram independentes.

### Onde editar

**1. `useOrganization.ts`** — adicionar 2 campos na interface `ThemeConfig`:
```ts
button_color?: string;       // fundo de botões/ações
category_color?: string;     // pill ativa + badges de quantidade
```

**2. `StoreProfileTab.tsx` (seção 🎨 Cores)** — virar 4 ColorFields visivelmente separados, cada um com:
- Nome próprio
- Descrição "Onde aparece: …"
- Mini-preview do elemento real (botão / pill / badge / preço)
- Botão "Padrão" individual

**3. `UnitPage.tsx`** — derivar cores e trocar usos:
- `buttonColor = themeConfig.button_color ?? primaryColor`
- `categoryColor = themeConfig.category_color ?? primaryColor`
- Linha 1050 (pill ativa) → `categoryColor`
- Linha 1096 (badge quantidade no canto da foto) → `categoryColor`
- Linha 1119 (botão "Add" do card) → `buttonColor`
- Linha 1128 (chip "no carrinho") → `categoryColor`
- Linha 1213 (botão flutuante "Ver carrinho") → `buttonColor`
- Linha 1231 (ícone carrinho no drawer) → `buttonColor`
- Linha 1254 (+ do item no carrinho) → `buttonColor`
- Linhas 1318/1343 (chip de tipo de pedido selecionado) → `buttonColor`
- Banner status (linha 953 borda esquerda) → mantém `primary_color` (identidade)
- Header (linhas 873-877) → mantém `primary_color` (identidade)

**4. `ItemDetailDrawer.tsx`** — receber `buttonColor`:
- Botão "+" do adicional (linha 150) → `buttonColor`
- Botão "+" da quantidade (linha 204) → `buttonColor`
- Botão "Adicionar R$ X" (linha 214) → `buttonColor`
- Preço (linha 106) e preço do adicional (linha 154) já usam `priceColor` ✅

**5. Reset de tema** — ampliar `handleResetTheme` para limpar também os 2 novos campos.

### Mini-previews (anti-confusão visual)

Cada ColorField mostrará exatamente o elemento que ele controla, em escala mini:
- Cor do cabeçalho: faixa colorida com "LOJA"
- Cor dos botões: pílula sólida "Comprar"
- Cor das pílulas: chip oval "Categoria"
- Cor dos preços: card branco com "R$ 19,90"

Assim, mesmo sem ler a descrição, o lojista vê na hora qual elemento vai mudar.

## Resultado esperado

- Você muda a "Cor das pílulas de categoria" pra azul → só as pílulas e badges de quantidade ficam azuis.
- Muda "Cor dos botões" pra verde → só os botões "Add"/"Adicionar"/"+" ficam verdes.
- Muda "Cor dos preços" pra preto → só os preços ficam pretos.
- Muda "Cor do cabeçalho" pra branco → só o banner fica branco (e os outros elementos continuam visíveis nas suas próprias cores, em vez de sumirem).
- Quem não mexer nas 2 cores novas continua com o comportamento antigo (tudo na cor primária).

## Arquivos a editar

- `src/hooks/useOrganization.ts` — adicionar `button_color` e `category_color` no `ThemeConfig`
- `src/components/dashboard/StoreProfileTab.tsx` — 4 ColorFields separados com previews dos elementos reais; reset estendido
- `src/pages/UnitPage.tsx` — derivar `buttonColor`/`categoryColor`, trocar usos listados acima
- `src/components/unit/ItemDetailDrawer.tsx` — receber e usar `buttonColor` nos botões

