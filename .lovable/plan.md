

# Diagnostico: Nominatim esta bloqueando TODAS as requisicoes

## Problema real identificado

Analisando os logs de rede, o problema nao e a formatacao do endereco. **TODAS as requisicoes ao Nominatim estao falhando com "Failed to fetch"** — inclusive as buscas simples como "Cubatao, SP, Brasil". Isso indica que o Nominatim esta bloqueando requisicoes vindas do dominio do preview (lovableproject.com) por CORS ou rate-limiting.

Evidencia nos logs:
- `GET nominatim.openstreetmap.org/search?q=Cubatão, SP, Brasil` → **Failed to fetch**
- `GET nominatim.openstreetmap.org/search?street=Rua+Jaime...&city=Cubatão` → **Failed to fetch**
- Dezenas de requisicoes consecutivas, todas falhando

O Nominatim tem uma politica estrita de uso: maximo 1 req/segundo e bloqueia user-agents genericos ou origens suspeitas. O app esta disparando multiplas requisicoes simultaneas (recalculo de varias entregas ao mesmo tempo), o que causa rate-limiting imediato.

## O que precisa ser feito

### 1. Mover a geocodificacao para uma edge function (backend)
Chamadas ao Nominatim devem sair do browser e ir pelo servidor. Isso resolve CORS e permite controlar rate-limiting centralmente.

- Criar edge function `geocode-address` que recebe um endereco e retorna coordenadas
- Criar edge function `calculate-delivery-distance` que recebe endereco da loja + endereco do cliente e retorna km + fee
- Ambas chamam o Nominatim e OSRM server-side (sem restricao de CORS)

### 2. Atualizar o fluxo de criacao de entrega
Em `useCreateDelivery.ts`, ao inves de chamar `geocodeAddress` direto no browser, chamar a edge function.

### 3. Atualizar o recalculo retroativo
Em `recalculateNullDistances`, chamar a edge function ao inves de fazer fetch direto do browser.

### 4. Atualizar o hook de distancia do checkout
Em `useDeliveryDistance.ts`, chamar a edge function ao inves de Nominatim direto.

## Secao tecnica

```text
Problema:
  Browser -> Nominatim = CORS block / rate limit
  Todas as requisicoes falham com "Failed to fetch"

Solucao:
  Browser -> Edge Function -> Nominatim = funciona (server-side, sem CORS)

Nova edge function: supabase/functions/geocode-distance/index.ts
  POST { store_address, customer_address }
  Retorna { distance_km, fee, store_coord, customer_coord }
  - Usa geocodeAddress() server-side (sem CORS)
  - Usa getRouteDistanceKm() server-side
  - Aplica rate-limit interno (300ms entre chamadas)
  - Retorna null se coordenadas identicas

Arquivos alterados:
  1. supabase/functions/geocode-distance/index.ts (novo)
     - Importa logica de geocode.ts adaptada para Deno
     - Endpoint POST que recebe enderecos e retorna distancia

  2. src/hooks/useCreateDelivery.ts
     - calculateAndUpdateDelivery chama edge function
       ao inves de geocodeAddress direto
     - recalculateNullDistances chama edge function

  3. src/hooks/useDeliveryDistance.ts
     - useDeliveryDistance chama edge function
       ao inves de Nominatim direto

  4. src/lib/geocode.ts
     - Manter como utilidade compartilhada
     - Adicionar funcao que chama a edge function
```

Resultado: geocodificacao funciona de forma confiavel porque roda no servidor sem restricoes de CORS, e o rate-limiting do Nominatim e respeitado com delays entre chamadas.

