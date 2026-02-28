

## Problema identificado

O `useDeliveryFee` faz chamadas **diretas do navegador** para o Nominatim (geocoding) e OSRM (rota). Isso causa:

1. **Múltiplas chamadas sequenciais** — até 8 requisições ao Nominatim (loja + cliente, com retries de 1.5s cada)
2. **Delays artificiais** — `tryGeocodeWithRetry` espera 1.5s entre tentativas
3. **CORS/rate-limit** — Nominatim bloqueia chamadas do navegador com frequência
4. **Sem cache** — endereço da loja é geocodificado toda vez que o componente remonta

Já existe uma Edge Function `geocode-distance` que faz tudo server-side, mas o `useDeliveryFee` **não a utiliza** — tem sua própria lógica de geocoding duplicada.

## Plano: Migrar useDeliveryFee para usar a Edge Function

### 1. Refatorar `useDeliveryFee` para usar `geocode-distance`
**Arquivo**: `src/hooks/useDeliveryFee.ts`

- Remover toda a lógica local de geocoding (~100 linhas): `tryGeocode`, `tryGeocodeWithRetry`, `geocode`, `geocodeStoreAddress`, `getRouteDistanceKm`, `stripComplementForGeo`, `deduplicateAddressParts`
- Chamar a Edge Function `geocode-distance` via `calculateDistanceViaEdge` (de `src/lib/geocode.ts`) que já existe
- Manter o cache do resultado da loja via `useRef` para evitar recalcular quando só o endereço do cliente muda
- Manter o debounce de 800ms e a tabela de frete `applyFeeTable`

### 2. Otimizar a Edge Function `geocode-distance`
**Arquivo**: `supabase/functions/geocode-distance/index.ts`

- Reduzir delays entre chamadas: de 400ms para 200ms (server-side não tem rate-limit tão agressivo)
- Usar busca por CEP via ViaCEP primeiro para obter coordenadas mais precisas (extrair lat/lon do IBGE code quando disponível)
- Geocodar loja e cliente em **paralelo** (hoje é sequencial com delay de 400ms entre eles)
- Reduzir delay de retry do OSRM: de 1500ms para 500ms

### Arquivos alterados
1. `src/hooks/useDeliveryFee.ts` — simplificar para usar edge function
2. `supabase/functions/geocode-distance/index.ts` — paralelizar e reduzir delays

### Resultado esperado
- Tempo de cálculo reduzido de ~5-8s para ~1-3s
- Sem problemas de CORS
- Mais confiável (server-side não tem rate-limit do Nominatim para navegadores)

