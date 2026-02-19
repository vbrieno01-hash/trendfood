

# Indicador visual nos chips de pessoa

## O que muda

Cada chip de pessoa na barra de selecao vai mostrar um pequeno indicador (bolinha com numero) quando aquela pessoa ja tem itens no carrinho. Isso facilita saber rapidamente quem ja pediu algo.

## Como vai funcionar

- Ao lado do nome no chip, aparece um badge com o numero total de itens daquela pessoa (ex: "Joao 3")
- Se a pessoa nao tem itens, nenhum badge aparece
- O badge acompanha o estilo do chip (cores diferentes para ativo/inativo)

## Detalhes tecnicos

### Arquivo: `src/pages/TableOrderPage.tsx`

Na renderizacao dos chips (linhas 565-578), calcular a quantidade de itens por pessoa filtrando `cartItems` pelo `customer_name` e, se maior que zero, exibir um pequeno `<span>` com o numero ao lado do nome.

Logica:
```
const personItemCount = cartItems
  .filter(ci => ci.customer_name === name)
  .reduce((sum, ci) => sum + ci.quantity, 0);
```

Dentro do botao do chip, apos o nome, renderizar condicionalmente:
```
{personItemCount > 0 && (
  <span className="ml-1 bg-white/20 text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
    {personItemCount}
  </span>
)}
```

Nenhuma alteracao em banco de dados ou outros arquivos.
