

# Corrigir warning do CurrencyInput com forwardRef

## Problema
O console exibe um warning porque o `CurrencyInput` nao usa `React.forwardRef`, o que impede que refs sejam passadas corretamente (ex: quando usado dentro de formularios com react-hook-form).

## Solucao
Refatorar o componente `src/components/ui/currency-input.tsx` para usar `React.forwardRef`, mantendo toda a logica atual intacta.

## Alteracao tecnica

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/ui/currency-input.tsx` | Envolver o componente com `React.forwardRef`, passar a ref para o `<input>` interno, e adicionar `displayName` |

A interface `CurrencyInputProps` permanece igual. A unica mudanca e estrutural: de funcao simples para componente com `forwardRef`.

