

# Plano: Corrigir km dos motoboys não sendo calculado

## Diagnóstico

Confirmado com dados reais do banco: **TODAS as entregas têm `distance_km: NULL`**. A última entrega finalizada pela "juju" (id `385aef49...`) mostra `distance_km: nil, fee: 3` — ou seja, o cálculo de distância em background (`calculateAndUpdateDelivery`) está falhando silenciosamente em 100% dos casos.

A causa raiz está em **dois problemas**:

1. **Endereço da loja começa com CEP** (`11510-170, Rua Jaime João Olcese, Casa, Casa, Vila couto, Cubatão, SP, Brasil`). O Nominatim não consegue geocodificar quando o endereço começa com CEP brasileiro — ele não encontra resultado e retorna `null`. A função `geocode()` falha silenciosamente e o `distance_km` nunca é atualizado.

2. **Falha silenciosa total** — o `catch` vazio na `calculateAndUpdateDelivery` engole qualquer erro, então ninguém nunca é notificado de que o cálculo falhou. O motoboy vê "0.0 km" para sempre.

## O que será feito

### 1. Tornar a geocodificação mais resiliente
No `useCreateDelivery.ts`, melhorar a função `geocode`:
- Remover CEP do início do endereço antes de geocodificar (regex para tirar padrão `XXXXX-XXX,`)
- Remover duplicatas como "Casa, Casa" que poluem a query
- Se falhar, tentar apenas com "Rua, Bairro, Cidade, Estado"
- Se falhar novamente, tentar apenas "Cidade, Estado, Brasil"

### 2. Aplicar a mesma correção no `useDeliveryDistance.ts`
O hook de cálculo de distância no checkout usa a mesma lógica e também será afetado. Garantir consistência.

### 3. Adicionar log de erro ao invés de falha silenciosa
Trocar o `catch {}` vazio por `console.error` para que falhas de geocodificação sejam visíveis nos logs.

### 4. Recalcular entregas existentes com km nulo
Criar uma função que, ao carregar o dashboard de motoboys, detecte entregas com `distance_km: null` e `status: entregue` e tente recalcular em background — assim as entregas antigas também ganham os km corretos.

## Seção técnica

```text
Problema:
  store_address = "11510-170, Rua Jaime João Olcese, Casa, Casa, Vila couto, Cubatão, SP, Brasil"
  Nominatim não encontra endereço com CEP no início → geocode retorna null
  calculateAndUpdateDelivery falha silenciosamente → distance_km = NULL para sempre

Correção:

Arquivo 1: src/hooks/useCreateDelivery.ts
  - Nova função cleanAddressForGeocode(addr):
    - Remove CEP (regex /^\d{5}-?\d{3},?\s*/)
    - Remove "Casa" duplicado e tokens desnecessários
    - Gera variantes de fallback: [endereço completo limpo, "Rua, Bairro, Cidade, Estado", "Cidade, Estado, Brasil"]
  - Alterar geocode() para tentar cada variante sequencialmente
  - Trocar catch vazio por console.error

Arquivo 2: src/hooks/useDeliveryDistance.ts
  - Aplicar mesma lógica de cleanAddressForGeocode na função geocode()

Arquivo 3: src/components/dashboard/CourierDashboardTab.tsx (ou hook equivalente)
  - Ao carregar entregas entregues com distance_km === null:
    - Em background, tentar recalcular e atualizar no banco
    - Isso corrige entregas históricas sem km
```

Resultado: motoboys passam a ter km calculado automaticamente em novas entregas, e entregas antigas com km nulo são recalculadas.

