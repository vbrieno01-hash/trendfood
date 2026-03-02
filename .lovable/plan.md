

## Plano: Sempre buscar pelo bairro e mesclar resultados

### Problema

A lógica atual só busca pelo bairro (Search 3) quando as buscas anteriores retornam ≤1 resultado. Para Cubatão, a busca pela primeira palavra "Jaime" retorna 2 resultados, então a busca por bairro nunca é acionada. Resultado: apenas 2 cards em vez de 5.

### Solução

Mudar a lógica para **sempre executar a busca por bairro** e mesclar os resultados com os da busca por rua, em vez de usar como fallback condicional. Isso garante mais diversidade de bairros nos cards.

### Alterações

**1. `supabase/functions/viacep-proxy/index.ts`**
- Remover a condição `results.length <= 1` da busca por bairro (Search 3)
- Sempre executar a busca por bairro quando `bairro.length >= 3`
- Concatenar os resultados das buscas por rua e por bairro antes de deduplicar com `buildNearby`

**2. `supabase/functions/reverse-geocode/index.ts`**
- Mesma mudança: sempre buscar pelo bairro e mesclar com os resultados da rua
- Concatenar antes de chamar `buildCandidates`

### Lógica atualizada

```text
Busca 1: /{UF}/{cidade}/{rua sem prefixo}/json/
Busca 2: (se ≤1) /{UF}/{cidade}/{primeira palavra}/json/
Busca 3: (SEMPRE) /{UF}/{cidade}/{bairro}/json/
→ Mesclar resultados de (1 ou 2) + (3), deduplicar, limitar a 5
```

### Resultado esperado

Para CEP 11510-170 (Cubatão, Vila Couto): de 2 cards para 5 cards com bairros diversos (Vila Couto, Jardim Costa e Silva, Jardim São Francisco, Vila Paulista, etc).

