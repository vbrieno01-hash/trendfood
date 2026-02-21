
# Campo de preço com formato monetário brasileiro (R$ XX,XX)

## Problema
O campo de preço atual usa `<Input type="number">`, que exibe um campo numérico padrão sem formatação monetária. O usuário precisa digitar o preço sem ter uma vírgula fixa separando reais e centavos, o que causa confusão.

## Solução
Criar um componente `CurrencyInput` que:
- Exibe o valor sempre formatado como moeda brasileira (ex: `12,90`)
- Ao digitar, aceita apenas números e posiciona automaticamente os centavos (as duas últimas casas são sempre centavos)
- Internamente converte para número decimal (float) para salvar no banco normalmente

### Comportamento do input
- O usuário digita apenas números (sem ponto, sem vírgula)
- O componente formata automaticamente: digitar `1290` exibe `12,90`, digitar `500` exibe `5,00`
- Prefixo visual "R$" ao lado do campo

## Mudanças técnicas

### 1. Novo componente: `src/components/ui/currency-input.tsx`
- Componente controlado que recebe `value` (number em reais, ex: 12.90) e `onChange` (callback com number)
- Internamente armazena o valor em centavos como inteiro
- Formata a exibição com vírgula fixa (ex: `12,90`)
- Aceita apenas dígitos no `onKeyDown`/`onChange`
- Exibe prefixo "R$" dentro do campo

### 2. Alterar: `src/components/dashboard/MenuTab.tsx`
- Substituir o `<Input type="number">` do preço pelo novo `<CurrencyInput>`
- Remover os atributos `step`, `min`, `type="number"` do campo de preço
- Manter a mesma interface de `form.price` (valor em reais como float)
