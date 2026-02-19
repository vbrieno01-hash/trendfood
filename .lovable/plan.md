
# Diagnóstico definitivo e correção do geocoding da loja

## Causa raiz confirmada por log de rede real

O log de rede capturado durante o teste mostrou exatamente o que falha:

```
GET nominatim/search?q=11510-170, Rua Jaime João Olcese, 51, Vila Couto, Cubatão, SP, Brasil
Response Body: []   ← zero resultados!
```

O Nominatim não conhece "Rua Jaime João Olcese" — este nome de rua simplesmente não existe no mapa OpenStreetMap de Cubatão. Por isso, mesmo com CEP no início da string, a busca falha porque o Nominatim tenta combinar todos os tokens e não encontra correspondência.

**A solução correta:** Quando o endereço da loja começa com CEP, usar SOMENTE o CEP para geocodificar a loja. O CEP `11510-170` sozinho localiza o ponto geográfico com precisão máxima — o Nominatim entende CEP brasileiro diretamente.

## O que muda

Apenas um arquivo: `src/hooks/useDeliveryFee.ts`

### Função `geocodeStoreAddress` (nova)

Em vez de usar `stripComplementForGeo(storeAddress)` para geocodificar a loja, criaremos uma função específica que extrai somente o CEP quando disponível:

```typescript
// Geocodifica o endereço da loja de forma otimizada:
// Se começa com CEP, usa APENAS "CEP, Cidade, Estado, Brasil" — muito mais preciso no Nominatim.
// Fallback: endereço textual completo (sem complemento).
async function geocodeStoreAddress(address: string): Promise<GeoCoord | null> {
  const parts = address.split(",").map(p => p.trim()).filter(Boolean);
  const cepPattern = /^\d{5}-?\d{3}$/;
  
  if (cepPattern.test(parts[0] ?? "")) {
    // Endereço novo: CEP, rua, numero, [complement], bairro, cidade, estado, Brasil
    // Extrai CEP, cidade e estado para query mínima e precisa
    const cep = parts[0];
    // cidade = antepenúltimo (antes de estado e Brasil)
    const city = parts[parts.length - 3] ?? "";
    const state = parts[parts.length - 2] ?? "";
    
    // Tentativa 1: só o CEP (mais precisa)
    const r1 = await tryGeocode(`${cep}, Brasil`);
    if (r1) return r1;
    
    // Tentativa 2: CEP + cidade + estado
    const r2 = await tryGeocode(`${cep}, ${city}, ${state}, Brasil`);
    if (r2) return r2;
  }
  
  // Fallback: texto sem complemento
  return geocode(stripComplementForGeo(address));
}
```

### No `useEffect` do hook

Substituir:
```typescript
const coord = await geocode(stripComplementForGeo(storeAddress));
```
Por:
```typescript
const coord = await geocodeStoreAddress(storeAddress);
```

### Para o cliente (UnitPage.tsx já está correto)

O `fullCustomerAddress` já está montado como `"11510-020, 123, Cubatão, SP, Brasil"` — e o CEP `11510-020` (Rua Armando de Salles Oliveira) o Nominatim encontra normalmente. O geocoding do cliente já funciona com CEP.

A função `geocode` do hook também pode ser melhorada para, quando receber uma string que começa com CEP, tentar primeiro só o CEP:

```typescript
async function geocode(query: string): Promise<GeoCoord | null> {
  const parts = query.split(",").map(p => p.trim());
  // Se começa com CEP, tenta só o CEP primeiro
  if (/^\d{5}-?\d{3}$/.test(parts[0] ?? "")) {
    const r = await tryGeocode(`${parts[0]}, Brasil`);
    if (r) return r;
  }
  // Query completa
  const result = await tryGeocode(query);
  if (result) return result;
  // Fallback com Brasil
  if (!query.toLowerCase().includes("brasil")) {
    return tryGeocode(`${query}, Brasil`);
  }
  return null;
}
```

## Resultado esperado após a correção

```
Loja: storeAddress = "11510-170, Rua Jaime João Olcese, 51, Casa, Vila Couto, Cubatão, SP, Brasil"
geocodeStoreAddress extrai CEP → tryGeocode("11510-170, Brasil") → coordenadas ✓

Cliente: fullCustomerAddress = "11510-020, 123, Cubatão, SP, Brasil"  
geocode("11510-020, 123, Cubatão, SP, Brasil")
→ CEP detectado → tryGeocode("11510-020, Brasil") → coordenadas ✓

OSRM calcula rota entre os dois pontos → distância → frete R$ 5,00 ✓
```

## Arquivo a modificar

Apenas `src/hooks/useDeliveryFee.ts`:
- Adicionar função `geocodeStoreAddress` que prioriza CEP isolado
- Melhorar `geocode` para detectar e usar CEP sozinho primeiro
- Trocar chamada de `geocode(stripComplementForGeo(storeAddress))` por `geocodeStoreAddress(storeAddress)`
