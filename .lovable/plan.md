

# Plano: Corrigir geocodificação que resolve ambos os endereços para o mesmo ponto

## Problema raiz

O Nominatim não tem "Rua Jaime João Olcese" no banco de dados do OpenStreetMap para Cubatão. A busca por texto livre falha para ambos os endereços (loja e cliente), e ambos caem no fallback de bairro "Vila Couto, Cubatão, SP, Brasil", que resolve para o centroide do bairro. Como as coordenadas são idênticas, o OSRM retorna distância 0.

Além disso, o recálculo que busca `distance_km = 0` cria um **loop infinito**: abre o dashboard → detecta 0 → recalcula → obtém 0 de novo → salva 0 → próxima abertura repete.

## O que sera feito

### 1. Adicionar busca estruturada no Nominatim como fallback intermediario
Antes de cair para "Bairro, Cidade, Estado", tentar a busca estruturada do Nominatim com parametros separados (`street`, `city`, `state`, `country`). Isso tem mais chance de encontrar ruas que a busca por texto livre nao acha.

### 2. Detectar coordenadas identicas e aplicar distancia minima
Quando ambos os enderecos resolvem para o mesmo ponto exato (mesmas coordenadas), significa que a geocodificacao caiu no fallback de bairro para ambos. Nesse caso, em vez de salvar 0 km, nao atualizar o registro — deixar como esta para evitar o loop.

### 3. Parar o loop infinito de recalculo
Mudar a logica: o recalculo so busca `distance_km IS NULL` (nao 0). O valor 0 passa a significar "tentou calcular mas os enderecos resolveram para o mesmo ponto". Isso evita recalcular infinitamente.

### 4. Quando distancia e 0 por fallback identico, manter o fee base
O fee base (R$ 3,00) ja esta correto para entregas no mesmo bairro. O dashboard deve exibir "< 1 km" em vez de "0.0 km" quando a distancia for 0.

## Secao tecnica

```text
Arquivo 1: src/lib/geocode.ts
  - Nova funcao tryGeocodeStructured(street, city, state):
    Usa Nominatim /search com parametros street=, city=, state=, country=Brazil
    em vez de query q=
  - Atualizar buildAddressVariants para extrair rua/cidade/estado
    e inserir busca estruturada como segundo fallback
  - Em getRouteDistanceKm ou nova funcao auxiliar:
    detectar se from e to sao identicos (diff lat < 0.0001 e diff lon < 0.0001)
    e retornar null nesse caso para sinalizar "nao confiavel"

Arquivo 2: src/hooks/useCreateDelivery.ts
  - calculateAndUpdateDelivery: quando km === 0 E coordenadas sao identicas,
    NAO atualizar o registro (deixar distance_km como null)
  - recalculateNullDistances: reverter para buscar apenas
    distance_km IS NULL (remover distance_km.eq.0)
    para parar o loop infinito

Arquivo 3: src/components/dashboard/CourierDashboardTab.tsx
  - Reverter condicao para distance_km === null (sem incluir 0)
  - Na exibicao de km: mostrar "< 1 km" quando distance_km === 0
    em vez de "0.0 km"
```

Resultado: a busca estruturada tem mais chance de encontrar ruas brasileiras. Se mesmo assim ambos caem no mesmo ponto, o sistema nao entra em loop e exibe "< 1 km" com o fee base correto.

