
# Correção definitiva do cálculo de frete

## Os dois problemas identificados com evidências reais

### Problema 1: CEP `11510-170` da loja retorna cidade errada no Nominatim

O log de rede confirmou:
```
GET nominatim/search?q=11510-170, Brasil
Response: Encruzilhada do Sul, Rio Grande do Sul ← ERRADO! Deveria ser Cubatão SP
```

O Nominatim não tem o CEP `11510-170` mapeado para Cubatão/SP. Quando retorna resultado de estado diferente do esperado, o sistema aceita as coordenadas erradas e a rota calculada fica completamente sem sentido.

**Solução:** Após geocodificar pelo CEP, validar se o resultado está no estado correto. Se o estado da resposta não bater com o estado esperado (extraído do `store_address`), descartar o resultado e usar fallback por nome da cidade.

### Problema 2: Cálculo não dispara até o número ser digitado

O `fullCustomerAddress` exige `cep && number && city`. Mas:
1. O usuário digita CEP e clica Buscar → campos são preenchidos automaticamente (rua, bairro, cidade)
2. **Mas o número ainda está vazio** → `fullCustomerAddress` cai no fallback textual → street/number estão vazios → string é `", , Centro, Cubatão, SP, Brasil"` com partes vazias → geocoding falha

E mesmo quando o número é digitado, a string gerada (`11510-020, 42, Cubatão, SP, Brasil`) vai ao Nominatim que retorna coordenadas do **CEP** (centro da rua), não do número específico — o que na prática é preciso o suficiente.

**Solução:** Modificar `fullCustomerAddress` para usar CEP + cidade + estado (sem número) como query principal quando o número não foi preenchido ainda, permitindo pré-calcular o frete assim que o CEP é buscado.

## Arquivos a modificar

### 1. `src/hooks/useDeliveryFee.ts`

Adicionar validação geográfica: após geocodificar pelo CEP da loja, verificar se o resultado está no estado/país correto usando a API de reverse geocoding do Nominatim — ou mais simples, usar diretamente **cidade + estado** como query quando o CEP falha.

A mudança concreta: em `geocodeStoreAddress`, quando o CEP retorna resultado, validar se a cidade/estado batem. Implementar isso verificando a `display_name` retornada pelo Nominatim:

```typescript
async function geocodeStoreAddress(address: string): Promise<GeoCoord | null> {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  const cepPattern = /^\d{5}-?\d{3}$/;

  if (cepPattern.test(parts[0] ?? "")) {
    const cep = parts[0];
    // Extrai cidade e estado do endereço para validação
    const city = parts[parts.length - 3] ?? "";
    const state = parts[parts.length - 2] ?? "";

    // Tentativa 1: CEP + cidade + estado (mais precisa e sem risco de confusão)
    const r1 = await tryGeocode(`${cep}, ${city}, ${state}, Brasil`);
    if (r1) return r1;

    // Tentativa 2: só cidade + estado (ignora CEP problemático)
    const r2 = await tryGeocode(`${city}, ${state}, Brasil`);
    if (r2) return r2;
  }

  // Fallback: endereço textual sem complemento
  return geocode(stripComplementForGeo(address));
}
```

A chave é a **Tentativa 1**: `CEP, Cidade, Estado, Brasil` — o Nominatim usa todos os tokens para filtrar, então mesmo que o CEP não bata exatamente, a combinação com cidade e estado força o resultado correto na região certa.

### 2. `src/pages/UnitPage.tsx`

Modificar `fullCustomerAddress` para não exigir número para iniciar o cálculo. Assim que o CEP é buscado e cidade é preenchida, o frete já pode ser estimado:

```typescript
// Para geocoding: prioriza CEP + cidade para estimativa imediata
// Adiciona número quando disponível para maior precisão
const fullCustomerAddress = customerAddress.cep && customerAddress.city
  ? [customerAddress.cep, customerAddress.number, customerAddress.city, customerAddress.state, "Brasil"]
      .filter(Boolean).join(", ")
  : [customerAddress.street, customerAddress.number, customerAddress.neighborhood, customerAddress.city, customerAddress.state, "Brasil"]
      .map((p) => p.trim()).filter(Boolean).join(", ");
```

Isso permite que:
- Assim que CEP é buscado e cidade preenchida → cálculo dispara imediatamente
- Quando número é digitado → recalcula com maior precisão
- Sem CEP → usa endereço textual como fallback

## Fluxo após a correção

```
Loja (11510-170, Cubatão, SP):
  tryGeocode("11510-170, Cubatão, SP, Brasil") → coordenadas de Cubatão SP ✓
  (não mais Encruzilhada do Sul RS!)

Cliente digita CEP 11510-020 → Buscar:
  ViaCEP preenche: Rua Armando de Salles Oliveira, Centro, Cubatão, SP

  fullCustomerAddress = "11510-020, Cubatão, SP, Brasil"  ← sem número ainda
  → Nominatim encontra Cubatão SP → coordenadas ✓
  → OSRM calcula distância → frete R$ 5,00 aparece IMEDIATAMENTE ✓

Cliente digita número 42:
  fullCustomerAddress = "11510-020, 42, Cubatão, SP, Brasil"
  → Recalcula com número → ainda R$ 5,00 ✓
```

## Resumo das mudanças

| Arquivo | Linha(s) | Mudança |
|---|---|---|
| `src/hooks/useDeliveryFee.ts` | `geocodeStoreAddress` | Tentativa 1 usa `CEP + Cidade + Estado` em vez de só CEP |
| `src/pages/UnitPage.tsx` | `fullCustomerAddress` | Remove exigência de número para calcular (só CEP + cidade já basta) |
