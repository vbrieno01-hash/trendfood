

## Diagnóstico

A barra de categorias atual no `UnitPage` (vitrine pública) usa um emoji fixo da lista `CATEGORIES` (em `src/hooks/useMenuItems.ts`) que mapeia categorias do nicho de comida (🔥 Promoção, 🍔 Lanches, 🥤 Bebidas, etc.). Quando entra loja de roupa/cabelo/celular, esses emojis viram "parasitas" — ficam totalmente deslocados, infantis e quebram a credibilidade visual.

Onde aparece:
- `src/pages/UnitPage.tsx` — chips de categoria no topo do cardápio público
- `src/components/dashboard/CounterTab.tsx` — agrupamento no balcão (`getEmoji`)
- `src/components/dashboard/MenuTab.tsx` — provavelmente também usa
- `src/hooks/useMenuItems.ts` — fonte da verdade dos emojis (`CATEGORIES` array)

## Solução proposta — "Sem emoji parasita"

**Princípio:** parar de forçar emoji por categoria. Deixar o lojista escolher se quer ou não, e por padrão NÃO mostrar nenhum. Visual mais limpo, profissional, agnóstico de nicho.

### Frente 1 — Remover emoji por padrão das chips de categoria
Na vitrine pública (`UnitPage`) e onde mais aparecer:
- Categoria renderiza só o **nome**, sem emoji
- Chip ganha tipografia mais firme (font-medium), padding mais respirado
- Estado ativo: usa `primary_color` da loja (que já existe no tema custom) — fica coerente com a identidade dela
- Estado inativo: borda sutil + hover suave

Resultado: roupa, cabelo, celular, coxinha — todos ficam com chips elegantes e neutros. Cada loja respira sua própria identidade via `primary_color`.

### Frente 2 — Emoji opcional escolhido pelo lojista (não automático)
- Adicionar campo opcional `category_emojis` no banco (JSONB no `organizations`, tipo `{ "Lanches": "🍔", "Promoção": "🔥" }`)
- Na aba Catálogo do dashboard, ao lado de cada categoria, um botão pequeno "🎨 Ícone" abre um picker simples (lista curta de 30-40 emojis genéricos: 🛍️ 👕 💇 📱 🔥 ⭐ 🎁 etc.)
- Se o lojista escolher, o emoji aparece. Se não escolher, fica só o texto.
- **Migração suave:** lojas existentes começam SEM emoji (limpo). Quem quer o look antigo, escolhe manualmente.

### Frente 3 — Limpar a lista hardcoded `CATEGORIES`
- Em `src/hooks/useMenuItems.ts`, a constante `CATEGORIES` hoje tem ~10 categorias com emojis fixos focados em comida
- Mudar para: lista de categorias **sugeridas** (sem emoji obrigatório), e categoria livre continua funcionando como já funciona (lojista pode digitar qualquer nome)
- Função `getEmoji(category)` passa a retornar do `category_emojis` da org se existir, senão `null` (não renderiza nada)

### Frente 4 — Ajuste visual nas chips (puro CSS/Tailwind)
- Espaçamento entre chips: `gap-2` em vez de cramped
- Altura uniforme: `h-9` 
- Border-radius: `rounded-full` (já é, manter)
- Active state: fundo com `primary_color` + texto branco + leve sombra (`shadow-sm`)
- Inactive: `bg-muted/30` + `border border-border/50` + texto `text-muted-foreground`
- Truncate em nomes muito longos (ex: "Lanches com 1 hambúrguer e sem batata frita") com `max-w-[200px] truncate`

## Arquivos afetados

- `src/pages/UnitPage.tsx` — remover emoji das chips, melhorar estilo
- `src/components/dashboard/MenuTab.tsx` — adicionar picker de emoji opcional por categoria
- `src/components/dashboard/CounterTab.tsx` — usar emoji opcional
- `src/hooks/useMenuItems.ts` — refatorar `CATEGORIES` e `getEmoji`
- `src/hooks/useOrganization.ts` — adicionar `category_emojis` no tipo
- **Migração SQL:** adicionar coluna `category_emojis JSONB DEFAULT '{}'::jsonb` em `organizations`

## O que NÃO vou mexer

- Fluxo de pedido, checkout, RLS, edge functions
- Lógica de `paused_categories` 
- Ordenação manual de categorias (`category_order`)
- Tema custom da loja (continua respeitado)

## Resultado visual esperado

Antes: `🔥 Promoção do dia` `🍔 Lanches com 1...` `🥤 Bebidas` (parasita pra loja de roupa)

Depois (padrão): `Promoção do dia` `Lanches com 1...` `Bebidas` (limpo, profissional, funciona pra qualquer nicho)

Depois (lojista quis emoji): `🛍️ Coleção Verão` `👕 Camisetas` (escolhido por ela, contextual)

## Risco

Baixo. Migração só adiciona coluna nullable com default vazio. Visual fica mais limpo de imediato. Quem quiser emoji, configura.

