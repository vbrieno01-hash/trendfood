
## Diagnóstico

Concordo: do jeito que ficou, piorou porque a lógica das cores ficou “meio separada, meio herdada”.

Hoje existem 3 problemas ao mesmo tempo:

1. `primary_color` ainda vaza para partes da loja por fallback, então mudar uma cor ainda mexe em outra sem ficar óbvio.
2. O dashboard mostra previews simples demais, mas a loja real tem mais elementos usando outras classes/cores, então parece que “fonte” muda “balão”.
3. A separação ficou complexa demais na configuração, mas incompleta na vitrine.

## Plano de correção

### 1. Simplificar a configuração visual
Vou reorganizar o tema em 4 grupos sem ambiguidade:

- **Cabeçalho**: só topo da loja
- **Fonte / Preços**: só textos de destaque e valores
- **Botões**: Add, Adicionar, carrinho, ações
- **Balões / Categorias**: pill ativa, badge de quantidade, “no carrinho”

Campos como gradiente e cor do texto do cabeçalho ficam em uma área **Avançado**, para não poluir a configuração principal.

### 2. Remover os fallbacks que estão “misturando tudo”
Em vez de deixar `button_color` e `category_color` herdarem silenciosamente `primary_color`, vou normalizar o tema:

- ao abrir/salvar, o sistema passa a trabalhar com cores explícitas
- o `secondary_color` legado deixa de influenciar a loja
- cada grupo visual passa a ter uma cor própria estável

Isso evita o efeito “mudei fonte e mexeu no balão”.

### 3. Auditar a loja inteira por categoria visual
Vou revisar a vitrine e o checkout para mapear cada elemento para um grupo só:

- **Fonte / Preços**: preços do card, drawer, adicionais, totais relevantes
- **Balões / Categorias**: categoria ativa, quantidade na foto, “no carrinho”, chips visuais
- **Botões**: Add, Adicionar, +, Ver carrinho, ações do carrinho, seleção destacada
- **Cabeçalho**: topo e identidade

Também vou corrigir os pontos que ainda usam classes genéricas tipo `bg-primary`, `text-primary` e continuam fugindo da regra.

### 4. Ajustar o dashboard para ficar claro
Vou refazer a seção de cores para ela ficar mais fácil de entender:

- nomes mais diretos
- descrições curtas
- preview mais fiel ao que existe na loja real
- menos campos visíveis de uma vez
- reset do tema sem deixar “fantasma” salvo

### 5. Corrigir a consistência entre dashboard e loja
Vou garantir que o que aparece no dashboard seja o mesmo que a loja renderiza:

- mesma lógica de resolução de cor
- mesmas prioridades
- sem valor neutro escondido substituindo cor salva
- sem herança inesperada

### 6. Limpar o tema atual da loja
Como a configuração atual já ficou poluída pelas tentativas anteriores, vou incluir uma normalização do tema atual para que ele volte a um estado previsível antes de testar de novo.

## Arquivos principais

- `src/components/dashboard/StoreProfileTab.tsx`
- `src/pages/UnitPage.tsx`
- `src/components/unit/ItemDetailDrawer.tsx`
- `src/components/checkout/PixPaymentScreen.tsx`
- `src/hooks/useOrganization.ts`

## Resultado esperado

Depois dessa correção:

- mudar **fonte/preço** muda só texto e valores
- mudar **balão/categoria** muda só pills e badges
- mudar **botão** muda só ações clicáveis
- mudar **cabeçalho** muda só o topo

Sem mistura, sem fallback escondido, sem surpresa entre dashboard e loja.
