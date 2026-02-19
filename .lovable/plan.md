
# Redesign da Página Pública (UnitPage) — Cards Compactos

## Diagnóstico

Os cards do cardápio estão grandes por três razões:

1. **`aspect-[4/3]`** na foto — cria uma imagem muito alta (75% da largura do card). Em mobile, com grid de 2 colunas, cada imagem ocupa quase metade da tela.
2. **`grid gap-3 sm:grid-cols-2`** — em mobile, as 2 colunas tornam os cards estreitos e a imagem achatada fica desproporcional.
3. Emojis decorativos espalhados: no banner (`🛒`), no título de sugestões (`💬`), nos itens do select de pagamento, e no empty state (`💡`).

## Novo Layout — Lista Horizontal Compacta

Cada item do cardápio vira uma **linha horizontal** com thumbnail pequeno à esquerda e informações à direita — padrão usado por iFood, Rappi e apps de delivery modernos:

```text
┌─────────────────────────────────────────────┐
│  [Foto 72x72]  Nome do Item                  │
│                Descrição curta truncada...   │
│                R$ 36,00    [− 2 +] ou [+ Add]│
└─────────────────────────────────────────────┘
```

- Thumbnail: `w-[72px] h-[72px]` fixo, `rounded-xl`, object-cover
- Altura total da linha: ~80px (vs. atual ~200px+)
- Cabe 4-5x mais itens na tela ao mesmo tempo

## Mudanças Específicas

### Cards do Cardápio
- Remover grid de 2 colunas → lista vertical de 1 coluna (`space-y-2`)
- Card vira `flex flex-row` (horizontal) com thumbnail à esquerda
- Foto: `w-[72px] h-[72px] shrink-0 rounded-xl object-cover`
- Placeholder sem foto: fundo `bg-secondary` com ícone `ImageOff` pequeno (sem emoji)
- Padding interno: `p-3` (vs. o atual que tem foto `aspect-[4/3]` + `p-3` separados)
- Nome: `text-sm font-semibold`
- Descrição: `text-xs text-muted-foreground line-clamp-2` (já existe, mantido)
- Preço: `text-sm font-bold`
- Botão Adicionar: menor, `px-2.5 py-1` com ícone `Plus`

### Cabeçalho de Categoria
- Remover emoji do `<h2>` — manter só o texto
- Separador com linha horizontal sutil (já existe no dashboard, aplicar o mesmo padrão)

### Banner superior
- Remover emoji `🛒` da descrição — substituir por ícone Lucide `ShoppingCart` inline

### Aba de Sugestões
- Título: remover `💬` — manter o texto limpo
- Empty state: trocar `💡` por ícone Lucide `Lightbulb`
- Success state: trocar `🎉` por ícone Lucide `CheckCircle2` com cor verde
- Select de pagamento: remover emojis (`💵`, `💳`, `📱`)

### Sugestão Modal
- Success state: trocar `🎉` por ícone `CheckCircle2` verde

## Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `src/pages/UnitPage.tsx` | Cards de produto horizontais compactos, remoção de emojis decorativos, layout de lista |

Nenhuma mudança em banco de dados, rotas ou lógica de negócio.
