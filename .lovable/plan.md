
# Correção definitiva: Usar CEP para geocoding do cliente

## Diagnóstico completo do fluxo atual

Ao inspecionar o banco de dados e o código, identifiquei a causa raiz real do problema:

### Situação atual no banco
O `store_address` salvo é:
```
"Rua Jaime João Olcese, 51, Casa, Vila Couto, Cubatão, SP, Brasil"
```
Isso tem 7 partes → `stripComplementForGeo` remove "Casa" → correto para a loja.

### Problema do cliente
A string passada ao hook para geocoding do cliente é montada assim:
```typescript
const fullCustomerAddress = [
  customerAddress.street, customerAddress.number,
  customerAddress.neighborhood, customerAddress.city, customerAddress.state, "Brasil"
].join(", ");
// Exemplo: "Rua das Flores, 42, Centro, Cubatão, SP, Brasil"
```

O Nominatim falha frequentemente com endereços textuais porque:
- Nomes de rua têm variações de escrita ("Rua" vs "R.")
- Bairros às vezes não estão no mapa
- Qualquer pequena diferença faz retornar `[]`

**O CEP que o cliente já digitou é a forma mais precisa e confiável de localizar um endereço no Brasil via Nominatim.** Um CEP como `11510020` identifica uma rua única — o Nominatim geocodifica muito melhor com ele.

### Solução: Usar CEP como query principal no geocoding

Em vez de passar só o endereço textual, passar o **CEP + Número + Cidade** como estratégia principal, com fallback para o endereço completo.

## O que muda

### `src/pages/UnitPage.tsx`
Adicionar o CEP à string de geocoding do cliente. A nova estratégia de query será:

```
Tentativa 1: "CEP NÚMERO, CIDADE, ESTADO, Brasil"
             ex: "11510-020 42, Cubatão, SP, Brasil"

Tentativa 2 (fallback): "Rua das Flores, 42, Centro, Cubatão, SP, Brasil"
```

Isso é implementado passando o CEP junto na string para o hook:

```typescript
// Para geocoding: CEP + número + cidade como query principal (muito mais precisa no Nominatim)
const fullCustomerAddress = customerAddress.cep && customerAddress.number && customerAddress.city
  ? `${customerAddress.cep}, ${customerAddress.number}, ${customerAddress.city}, ${customerAddress.state}, Brasil`
  : [customerAddress.street, customerAddress.number, customerAddress.neighborhood, customerAddress.city, customerAddress.state, "Brasil"]
      .filter(Boolean).join(", ");
```

### `src/hooks/useDeliveryFee.ts`
Melhorar a função `geocode` para tentar múltiplas estratégias:

1. **Tentativa 1** — query original (que agora virá com CEP)
2. **Tentativa 2** — só CEP + cidade (ainda mais simples)
3. **Tentativa 3** — fallback com endereço textual

```typescript
async function geocode(query: string): Promise<GeoCoord | null> {
  // Tentativa 1: query original
  const result = await tryGeocode(query);
  if (result) return result;
  // Tentativa 2: com "Brasil" explícito
  if (!query.toLowerCase().includes("brasil")) {
    return tryGeocode(`${query}, Brasil`);
  }
  return null;
}
```

### `src/components/dashboard/StoreProfileTab.tsx`
O `buildStoreAddress` **não inclui o CEP** na string salva no banco! O CEP precisa ser incluído para que o geocoding da loja também se beneficie. Atualmente salva:
```
"Rua Jaime João Olcese, 51, Casa, Vila Couto, Cubatão, SP, Brasil"
```
Deveria incluir o CEP no início:
```
"11510-020, Rua Jaime João Olcese, 51, Casa, Vila Couto, Cubatão, SP, Brasil"
```

E o `stripComplementForGeo` no hook precisa ser ajustado para lidar com o novo formato que começa com CEP (8 partes ao invés de 7).

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/pages/UnitPage.tsx` | `fullCustomerAddress` prioriza CEP na query de geocoding |
| `src/hooks/useDeliveryFee.ts` | `stripComplementForGeo` atualizado para novo formato com CEP; lógica de geocoding da loja usa CEP |
| `src/components/dashboard/StoreProfileTab.tsx` | `buildStoreAddress` inclui CEP; `parseStoreAddress` lida com CEP no início |

## Fluxo final após a correção

```
Cliente digita CEP 11510-020
→ ViaCEP preenche: Rua Jaime João Olcese, Vila Couto, Cubatão, SP
→ Cliente digita número: 42

fullCustomerAddress = "11510-020, 42, Cubatão, SP, Brasil"
→ Nominatim encontra CEP → coordenadas precisas ✓

storeAddress = "11510-020, Rua Jaime João Olcese, 51, Casa, Vila Couto, Cubatão, SP, Brasil"
stripComplementForGeo → "11510-020, Rua Jaime João Olcese, 51, Vila Couto, Cubatão, SP, Brasil"
→ Nominatim encontra → coordenadas precisas ✓

OSRM calcula rota → 0.3 km → frete R$ 5,00 ✓
```

## Compatibilidade retroativa

- `parseStoreAddress` aceita tanto o formato antigo (sem CEP) quanto o novo (com CEP no início)
- Endereços já salvos sem CEP continuam funcionando via fallback textual
- Nenhuma migração de banco necessária
