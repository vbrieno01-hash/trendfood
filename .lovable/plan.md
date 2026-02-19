
# Correção: "Endereço não encontrado" no cálculo de frete

## Causa raiz

O endereço da loja salvo no banco é `"rua Jaime João olcese"` — sem cidade, estado ou país. O Nominatim (geocodificação gratuita do OpenStreetMap) não consegue localizar endereços ambíguos sem contexto geográfico.

Além disso, a função `extractCityState` tenta extrair cidade/estado do endereço da loja para complementar o endereço do cliente. Como o endereço da loja não tem vírgulas, ela retorna o endereço inteiro como se fosse "cidade/estado", o que contamina a busca do cliente.

Resultado: **ambas as geocodificações falham** → "Endereço não encontrado".

## Três melhorias combinadas

### 1. Fallback de país "Brasil" no geocoding

Quando o Nominatim não encontrar um endereço na primeira tentativa, fazer uma segunda tentativa adicionando `", Brasil"` ao final. Isso resolve a maioria dos casos de endereços sem estado/cidade explícitos.

```
Tentativa 1: "rua Jaime João olcese"          → sem resultados
Tentativa 2: "rua Jaime João olcese, Brasil"  → encontrado!
```

### 2. Complemento do endereço do cliente mais inteligente

Atualmente o código sempre usa os últimos dois tokens separados por vírgula do endereço da loja como "cidade/estado". Se o endereço da loja não tem vírgulas (como `"rua Jaime João olcese"`), a função retorna o endereço inteiro, poluindo o endereço do cliente.

A correção: só complementar o endereço do cliente com cidade/estado da loja quando o endereço da loja tiver pelo menos 2 partes separadas por vírgula. Sempre adicionar `", Brasil"` ao endereço do cliente se ele não contiver o país.

### 3. UX melhorada: pedido pode ser enviado mesmo sem frete calculado

Quando o frete não pode ser calculado (por endereço incompleto da loja ou do cliente), em vez de bloquear o pedido, mostrar uma mensagem informativa e permitir que o pedido seja enviado com frete "A combinar". O lojista combina o frete via WhatsApp.

Isso evita que o cliente fique preso na tela por causa de uma limitação de geocodificação.

## O que vai mudar visualmente

**Antes** (com erro):
```
🛵 Frete    ❌ Endereço não encontrado
```

**Depois (durante digitação / endereço curto)**:
```
🛵 Frete    Digite seu endereço
```

**Depois (quando geocodificação falha)**:
```
🛵 Frete    A combinar via WhatsApp
```
(pedido pode ser enviado normalmente)

**Quando funcionar corretamente**:
```
🛵 Frete (1,8 km)    R$ 5,00
```

## Arquivo afetado

Somente `src/hooks/useDeliveryFee.ts`:

1. Função `geocode` atualizada para tentar com `", Brasil"` como fallback:
```typescript
async function geocode(query: string): Promise<GeoCoord | null> {
  // Tentativa 1: endereço original
  const result = await tryGeocode(query);
  if (result) return result;
  // Tentativa 2: com "Brasil" como fallback de país
  if (!query.toLowerCase().includes("brasil")) {
    return tryGeocode(`${query}, Brasil`);
  }
  return null;
}
```

2. Complemento do endereço do cliente corrigido:
```typescript
// Só complementa com cidade/estado se o endereço da loja tiver vírgulas
const cityState = extractCityState(storeAddress);
const hasCityState = storeAddress.includes(",");
const fullCustomerAddress = (customerAddress.includes(",") || !hasCityState)
  ? `${customerAddress}, Brasil`
  : `${customerAddress}, ${cityState}`;
```

3. No `UnitPage.tsx`: quando `feeError` e não é `noStoreAddress`, em vez de mostrar erro vermelho "Endereço não encontrado", mostrar texto neutro "A combinar". O botão de envio fica habilitado e o frete é registrado nas notas como "A combinar".

## Arquivos afetados

| Arquivo | O que muda |
|---|---|
| `src/hooks/useDeliveryFee.ts` | Fallback de país no geocoding + complemento inteligente do endereço |
| `src/pages/UnitPage.tsx` | UX do erro de frete: "A combinar" em vez de mensagem vermelha; inclui "A combinar" nas notas quando o frete não pôde ser calculado |
