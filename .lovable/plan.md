

## Plano: Seletor de endereços após GPS (estilo Select)

### Ideia

Quando o GPS localizar o usuário, a edge function `reverse-geocode` já consulta o ViaCEP e pode retornar **múltiplos resultados** (várias ruas/CEPs próximos). Hoje só usamos o primeiro. A ideia é retornar **todos** os resultados e mostrar um Select para o cliente escolher o endereço correto -- igual ao campo de UF que já usa Select.

### Alterações

**1. Edge function `reverse-geocode/index.ts`**
- Retornar um array `candidates` com até 5 resultados do ViaCEP (cada um com `cep`, `street`, `neighborhood`, `city`, `state`)
- Manter o campo `street`, `cep`, etc. de nível raiz como o primeiro resultado (compatibilidade)
- Formato: `{ street, neighborhood, city, state, cep, candidates: [{ cep, street, neighborhood, label }, ...] }`
- O campo `label` será algo como `"Rua X, Bairro Y - 01234-567"` para exibição no Select

**2. `src/pages/UnitPage.tsx`**
- Novo estado `addressCandidates: Array<{ cep, street, neighborhood, label }>` (inicialmente vazio)
- Quando `handleGetLocation` receber `data.candidates`, armazenar no estado
- Mostrar um Select logo abaixo do botão GPS com as opções (visível só quando `candidates.length > 1`)
- Ao selecionar uma opção, preencher `customerAddress` com os dados daquele candidato
- Se houver só 1 resultado, preencher direto sem mostrar Select (comportamento atual)

### Fluxo do usuário

```text
[Usar minha localização] → GPS → reverse-geocode → ViaCEP retorna 3 resultados
                                                          ↓
                                              ┌─────────────────────────┐
                                              │ Selecione seu endereço: │
                                              │ ▼ Rua A, Centro - 11111 │
                                              │   Rua A, Vila X - 11112 │
                                              │   Rua B, Centro - 11113 │
                                              └─────────────────────────┘
                                                          ↓
                                              Campos preenchidos automaticamente
```

### Detalhes técnicos

- O ViaCEP já retorna um array quando buscamos por `/{UF}/{cidade}/{rua}/json/` -- hoje descartamos tudo exceto `[0]`
- Limitar a 5 candidatos para não poluir a UI
- O Select usa os mesmos componentes Radix já importados no UnitPage

