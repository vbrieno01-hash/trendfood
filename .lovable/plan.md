

## Problema: Nomes dos itens invisíveis no mobile

No layout atual, cada item do cardápio está numa única linha flex horizontal com **todos os elementos como `shrink-0`** exceto o nome:

```text
[Imagem 56px] [Nome flex-1] [Preço 96px] [Switch + 3 botões ~128px] 
```

Numa tela de ~360px, sobram **0px para o nome** — ele é esmagado pelo `min-w-0` + `truncate`.

## Solução

Reestruturar o layout de cada item para **duas linhas no mobile**:

```text
Linha 1: [Imagem] [Nome + Descrição]        [Preço]
Linha 2:                          [Switch] [Editar] [Copiar] [Excluir]
```

### Mudanças em `src/components/dashboard/MenuTab.tsx` (linhas 371-435):

Substituir o layout flat de uma linha por um layout de duas linhas:

1. **Linha superior**: imagem (w-12 h-12, menor) + nome/descrição (flex-1) + preço (sem width fixo, shrink-0)
2. **Linha inferior**: botões de ação alinhados à direita (switch + editar + copiar + excluir)

Isso garante que o nome sempre tem espaço suficiente porque não compete com os botões de ação na mesma linha.

### Detalhes técnicos

- A div externa do item passa de `flex items-center` para `flex flex-col`
- Primeira sub-div: `flex items-center gap-3` com imagem + nome + preço
- Segunda sub-div: `flex items-center justify-end gap-1.5` com os botões
- Remove `w-24` fixo do preço — usa `shrink-0 whitespace-nowrap` para que ocupe só o necessário
- Imagem reduzida de `w-14 h-14` para `w-12 h-12` para dar mais espaço ao nome
- Aplica a todas as telas (não é condicional por breakpoint), mantendo consistência global

