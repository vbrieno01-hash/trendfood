

# Adicionar exemplo de nome nos campos de pessoa

## O que muda

Os campos de nome na tela de setup vao mostrar um placeholder com exemplo de nome real em vez de apenas "Pessoa 1", "Pessoa 2", facilitando o entendimento do que preencher.

## Como vai funcionar

- O placeholder de cada campo vai mudar para incluir um exemplo: "Ex: João", "Ex: Maria", "Ex: Pedro", etc.
- A lista de nomes de exemplo vai rotacionar entre opcoes comuns brasileiras

## Detalhes tecnicos

### Arquivo: `src/pages/TableOrderPage.tsx`

Na linha 521, trocar o placeholder de `Pessoa ${index + 1}` para nomes de exemplo usando um array:

```typescript
const exampleNames = ["João", "Maria", "Pedro", "Ana", "Lucas", "Julia", "Carlos", "Beatriz", "Rafael", "Larissa"];

// No placeholder:
placeholder={`Ex: ${exampleNames[index % exampleNames.length]}`}
```

Nenhuma outra alteracao necessaria.
