
# Drawer de Detalhe do Item — Página Pública

## Diagnóstico

O grid de 3 colunas deixa cada card com ~118px de largura — espaço insuficiente para mostrar a descrição inline. Remover a descrição foi a escolha técnica correta para o grid, mas o cliente perde informação essencial sobre o produto.

A solução padrão de mercado (iFood, Rappi, Uber Eats) é: card compacto no grid + drawer/modal com detalhes ao tocar.

## Comportamento Novo

Ao clicar em qualquer card do cardápio:
1. Um **Drawer** desliza de baixo para cima
2. Mostra: foto grande (aspect-video), nome completo, descrição completa, preço e controle de quantidade
3. Botão "Adicionar ao carrinho" (ou stepper se já há qty > 0)
4. O drawer fecha ao arrastar para baixo ou clicar fora

O card no grid continua igual — apenas o ícone de quantidade (badge) indica itens já adicionados.

## Estrutura do Drawer

```text
┌──────────────────────────────────┐
│ ▬▬▬ (handle de arraste)          │
│                                  │
│  [Foto grande — aspect-video]    │
│                                  │
│  Nome Completo do Item           │
│  Descrição completa do produto   │
│  que pode ser mais longa...      │
│                                  │
│  R$ 36,00                        │
│                                  │
│  [− 2 +]  ou  [+ Adicionar]      │
└──────────────────────────────────┘
```

## Mudanças Técnicas

### Estado novo
```typescript
const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
```

### Card no grid — adicionar onClick
- Toda a área do card (exceto os botões de qty) torna-se clicável: `onClick={() => setSelectedItem(item)}`
- Os botões `−` e `+` recebem `e.stopPropagation()` para não abrir o drawer ao ajustar quantidade

### Drawer de detalhe (componente inline)
- Usa o componente `Drawer` já instalado (`vaul`) — já importado no arquivo
- `open={selectedItem !== null}` / `onClose={() => setSelectedItem(null)}`
- Foto: `w-full aspect-video object-cover` (ou `aspect-square` se não tiver foto, com placeholder `ImageOff`)
- Nome: `text-lg font-bold`
- Descrição: `text-sm text-muted-foreground` (completa, sem line-clamp)
- Preço: `text-xl font-bold` com cor primária
- Botão de adicionar: mesma lógica do card — se qty=0 mostra `[+ Adicionar]`, se qty>0 mostra stepper `[− N +]`
- Botão fecha o drawer após adicionar (opcional)

### Indicador de quantidade no card
Quando `qty > 0`, mostrar um **badge circular** no canto superior direito da foto com o número — feedback visual imediato de que o item está no carrinho.
- `absolute top-1 right-1 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center`
- Cor: `primaryColor`

## Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `src/pages/UnitPage.tsx` | Adicionar estado `selectedItem`, `onClick` nos cards, badge de qty na foto, Drawer de detalhe |

Nenhuma mudança em banco de dados, rotas ou lógica de negócio.
