

# Redesign Visual da Pagina Publica (UnitPage)

A pagina publica esta com um visual generico e pouco polido. Vamos modernizar sem alterar a logica, apenas o visual.

## Problemas atuais

- Banner com bordas arredondadas demais e cores pastel fracas
- Cards do grid com estilo muito basico (borda fina, sem sombra, sem hover refinado)
- Header de categoria com texto muito pequeno e sem personalidade
- Botao "Add" dentro do card pequeno demais e sem destaque
- Badge "Fechado" com estilo generico
- Falta de hierarquia visual entre elementos
- Tipografia do nome do produto muito pequena (text-xs)

## Mudancas planejadas

### 1. Header (linha 536-552)
- Sombra sutil no header sticky em vez de apenas border-b
- Nome da loja com fonte maior

### 2. Banner (linha 559-597)
- Estilo mais limpo: fundo branco com borda lateral colorida (accent bar) em vez de fundo pastel
- Badge de status com design mais sofisticado
- Remover emoji de cadeado, usar icone Lucide

### 3. Cards de produto (linha 679-749)
- Sombra sutil (shadow-sm) e hover com elevacao (hover:shadow-md)
- Bordas mais suaves com rounded-2xl
- Nome do produto de text-xs para text-sm com font-semibold
- Preco com mais destaque visual
- Botao "Add" maior e mais visivel
- Controles +/- maiores e mais clicaveis

### 4. Header de categoria (linha 669-674)
- Texto um pouco maior (text-sm) com mais espacamento
- Linha separadora mais sutil

### 5. Category pills (linha 646-660)
- Pills com mais padding e bordas mais arredondadas
- Transicao mais suave

### 6. Geral
- Espacamento entre secoes mais generoso
- Background da pagina com tom muito sutil para dar mais profundidade

---

## Detalhes tecnicos

Arquivo alterado: `src/pages/UnitPage.tsx`

Mudancas sao apenas de classes CSS (Tailwind) e nenhuma alteracao de logica, rotas ou banco de dados. O layout grid de 3 colunas e o Drawer de detalhes permanecem iguais.

