
# Grid de 3 Colunas na Página Pública — Cards Verticais Compactos

## Diagnóstico

O layout atual é uma **lista vertical de 1 coluna** com cards horizontais (thumbnail 72x72 à esquerda + texto à direita). Para fazer **3 colunas lado a lado**, o card precisa mudar de orientação: a foto vai para **cima** e o texto fica **embaixo** — modelo clássico de vitrine/loja.

O problema de espaço é real: 3 colunas em mobile (390px) = ~118px de largura por card. Com o card horizontal atual (72px de thumb + texto), ficaria espremido demais. A solução é um **card vertical compacto**:

```text
┌──────┐ ┌──────┐ ┌──────┐
│ foto │ │ foto │ │ foto │
│──────│ │──────│ │──────│
│ Nome │ │ Nome │ │ Nome │
│R$XX  │ │R$XX  │ │R$XX  │
│[+Add]│ │[+Add]│ │[+Add]│
└──────┘ └──────┘ └──────┘
```

## Novo Layout — Grid 3 Colunas

### Estrutura do card vertical
- Container: `grid grid-cols-3 gap-2` (substitui `space-y-2`)
- Card: `flex flex-col bg-card border border-border rounded-xl overflow-hidden`
- Foto: `w-full aspect-square object-cover` — quadrado perfeito, preenche toda a largura
- Placeholder sem foto: `aspect-square bg-secondary flex items-center justify-center` com `ImageOff`
- Área de texto: `p-2 flex flex-col gap-1`
- Nome: `text-xs font-semibold leading-tight line-clamp-2`
- Preço: `text-xs font-bold` com a cor primária
- Badge "Indisponível": `text-[10px]` abaixo do nome
- Botão Adicionar: largura total `w-full`, `text-[10px] py-1`, centralizado — ou ícone `+` apenas quando item já está no carrinho (stepper compacto)

### Controles de quantidade no grid 3 colunas
Quando qty > 0, o stepper `[− N +]` precisa caber na largura de ~118px:
- `flex items-center justify-between w-full`
- Botões: `w-5 h-5 rounded-full`
- Número: `text-xs font-bold`

### Descrição
- **Removida** no grid de 3 colunas — não há espaço. O nome em `line-clamp-2` + preço já comunicam o essencial.

## Arquivo Afetado

| Arquivo | Mudança |
|---|---|
| `src/pages/UnitPage.tsx` | Linha 376: `space-y-2` → `grid grid-cols-3 gap-2`; Card muda de `flex-row` para `flex-col`; foto vira `aspect-square`; texto em `p-2`; descrição removida; stepper adaptado para espaço pequeno |

Nenhuma mudança em banco de dados, rotas ou lógica de negócio.
