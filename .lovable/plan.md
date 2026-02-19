
# Tornar o Calculo de Frete Mais Resiliente

## Problemas Identificados

1. **ViaCEP falhando**: A busca do CEP pode falhar por problemas de rede/CORS. Quando isso acontece, o endereco do cliente fica vazio e o frete nao e calculado.
2. **Endereco da loja com rua duplicada**: O `store_address` do "Burguer do Rei" esta salvo como `"11510-170, Rua Jaime Joao Olcese, Rua Jaime Joao Olcese, Vila Couto, Cubatao, SP, Brasil"` -- a rua aparece duas vezes, o que pode confundir o geocoder.
3. **Sem retry nas APIs externas**: Se Nominatim ou OSRM falham uma vez, nao ha nova tentativa.

## Solucoes

### 1. Retry automatico no ViaCEP (`src/pages/UnitPage.tsx`)
- Adicionar uma tentativa extra com `setTimeout` de 1s se a primeira chamada falhar
- Manter a mensagem de erro apenas se ambas falharem

### 2. Permitir calculo de frete com endereco manual (`src/pages/UnitPage.tsx`)
- Mesmo se o ViaCEP falhar, o usuario pode preencher manualmente Cidade e Estado
- O `fullCustomerAddress` ja considera esse caso (branch sem CEP), mas o campo Cidade e Estado estao vazios quando o CEP falha
- Adicionar um Select para Estado (UF) e permitir que Cidade seja digitada, independente do CEP

### 3. Retry nas chamadas de geocoding (`src/hooks/useDeliveryFee.ts`)
- Adicionar retry com backoff (1 tentativa extra apos 1.5s) nas funcoes `tryGeocode` e `getRouteDistanceKm`
- Ajuda quando Nominatim ou OSRM estao com rate-limit temporario

### 4. Limpar rua duplicada no geocoding da loja (`src/hooks/useDeliveryFee.ts`)
- Na funcao `geocodeStoreAddress`, detectar e remover campos duplicados consecutivos antes de montar a query
- Previne que o geocoder se confunda com enderecos mal formatados

## Detalhes tecnicos

### `src/hooks/useDeliveryFee.ts`

**Funcao `tryGeocode`**: Adicionar wrapper com retry
```typescript
async function tryGeocodeWithRetry(query: string): Promise<GeoCoord | null> {
  const result = await tryGeocode(query);
  if (result) return result;
  // Retry apos 1.5s
  await new Promise((r) => setTimeout(r, 1500));
  return tryGeocode(query);
}
```

**Funcao `geocodeStoreAddress`**: Antes de geocodificar, remover partes duplicadas consecutivas do endereco.

**Funcao `getRouteDistanceKm`**: Adicionar try/catch com retry.

### `src/pages/UnitPage.tsx`

**`fetchCustomerCep`**: Adicionar retry (2a tentativa apos 1s em caso de falha de rede).

**Campo Estado**: Trocar de `Select` placeholder para um `Select` funcional com todos os 27 UFs, permitindo preenchimento manual mesmo sem ViaCEP.

## Resumo de arquivos

| Arquivo | Acao |
|---------|------|
| `src/hooks/useDeliveryFee.ts` | Retry no geocoding + limpeza de enderecos duplicados |
| `src/pages/UnitPage.tsx` | Retry no ViaCEP + UF selecionavel manualmente |
