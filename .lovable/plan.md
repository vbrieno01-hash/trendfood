

## Plano — voltar cores ao padrão laranja, manter estilos

### O que muda

A seção **Cores da loja** (com os 4 campos numerados — Cabeçalho, Fonte dos preços, Botões, Balões) será **removida** do dashboard. As cores voltam todas para o padrão laranja (`#f97316`) automaticamente, sem o lojista precisar configurar nada.

### O que continua igual

Permanecem na configuração:
- **Estilo do cabeçalho** — Sólido / Transparente / Gradiente
- **Estilo dos botões** — Arredondado / Pill / Quadrado
- **Estilo dos cards** — Flat / Sombra / Bordas
- **Fonte** — Padrão / Moderna / Clássica / Divertida / Roboto / Poppins / Open Sans

### Como vai ficar a vitrine

- Cabeçalho: laranja `#f97316`
- Preços nos cards: cor padrão escura (`#1e293b`)
- Botões "Add", "Adicionar", "Ver carrinho", "+": laranja
- Balões/categoria selecionada/badges: laranja

Ou seja, todas as lojas vão ficar visualmente consistentes no padrão TrendFood (laranja), mas cada lojista ainda escolhe formato dos botões/cards e fonte.

### Limpeza no banco

Como várias lojas já experimentaram cores (e algumas ficaram com brancos invisíveis), vou rodar uma limpeza única que **zera os campos de cor personalizados** em todas as organizations:

- `primary_color` → `#f97316` (padrão)
- `theme_config.accent_text_color` → removido (volta para padrão `#1e293b`)
- `theme_config.button_color` → removido (volta para usar a cor padrão)
- `theme_config.category_color` → removido (volta para usar a cor padrão)
- `theme_config.gradient_color` → removido
- `theme_config.header_text_color` → removido (volta para branco)

Os campos `header_style`, `button_style`, `card_style` e `font` **continuam preservados** — cada lojista mantém o estilo que escolheu.

### Ajustes no preview da seção Tema Visual

O mini-preview embaixo (que mostra a barra do header + botão "Pedir agora" + chip "Categoria") continua, mas passa a usar sempre o laranja padrão como cor — assim o lojista vê na hora como vai ficar a loja com o estilo escolhido.

### Arquivos afetados

- `src/components/dashboard/StoreProfileTab.tsx` — remover bloco "Cores da loja" (linhas ~630-771) e o input de slug "Cor primária"; ajustar preview embaixo para usar laranja fixo
- `src/hooks/useOrganization.ts` — manter `button_color`/`category_color` no tipo (pra não quebrar imports), mas não expor mais na UI
- `src/pages/UnitPage.tsx` — quando `button_color`/`category_color` não existirem, cair direto no laranja `#f97316`
- `src/components/unit/ItemDetailDrawer.tsx` — mesmo fallback pro laranja
- migração SQL — normalizar `theme_config` de todas as organizations removendo os 4 campos de cor personalizados, e setar `primary_color = '#f97316'`

### Resultado

- Dashboard fica mais limpo: lojista só decide **formato e fonte**, não cor
- Nunca mais terá lojista botando branco em fundo branco e sumindo elemento
- Identidade visual TrendFood (laranja) fica padronizada em todas as lojas
- Ainda assim cada loja consegue se diferenciar pelo estilo de botão, card e fonte

