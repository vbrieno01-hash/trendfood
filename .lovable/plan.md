

# Diagnóstico: km dos motoboys mostra 0 mesmo após correção

## O que foi encontrado

Os dados no banco confirmam o problema:

- As 3 entregas da juju estão com `distance_km: 0` (zero exato, **não** NULL)
- O endereço da loja é: `11510-170, Rua Jaime João Olcese, Casa, Casa, Vila couto, Cubatão, SP, Brasil`
- O endereço do cliente é: `Rua Jaime João Olcese, 675, Vila Couto, Cubatão, SP, Brasil`

**Duas causas raiz:**

1. **A função de recálculo só busca `distance_km IS NULL`** — mas os valores são `0`, não NULL. O cálculo inicial rodou mas ambos os endereços geocodificaram para o mesmo ponto genérico (CEP no início do endereço da loja confunde o Nominatim), resultando em 0 km.

2. **O recálculo retroativo ignora entregas com `distance_km = 0`** — a condição `.is("distance_km", null)` no `recalculateNullDistances` pula todas as entregas da juju.

## O que será feito

### 1. Expandir o recálculo para incluir `distance_km = 0`
No `recalculateNullDistances`, além de buscar `IS NULL`, buscar também `distance_km = 0` — pois 0 indica que o cálculo original falhou silenciosamente.

### 2. Garantir que a limpeza de endereço está funcionando corretamente
O `geocodeAddress` do `geocode.ts` já limpa CEP, mas preciso confirmar que está sendo usado no fluxo de recálculo (já foi corrigido no último commit).

### 3. Invalidar corretamente o cache após recálculo
No `CourierDashboardTab`, a invalidação do cache após recálculo usa `["org-deliveries"]` mas a query key real é `["deliveries", orgId, ...]`. Corrigir para invalidar a chave certa.

## Seção técnica

```text
Arquivo 1: src/hooks/useCreateDelivery.ts (recalculateNullDistances)
  - Linha 122: trocar .is("distance_km", null)
    por: .or("distance_km.is.null,distance_km.eq.0")
  - Isso faz o recálculo pegar as entregas da juju que têm 0

Arquivo 2: src/components/dashboard/CourierDashboardTab.tsx
  - Linha 154: trocar condição d.distance_km === null
    por: (d.distance_km === null || d.distance_km === 0)
  - Linha 158: trocar queryKey ["org-deliveries"]
    por: ["deliveries", orgId] para invalidar corretamente

Resultado: ao abrir o dashboard de motoboys, entregas com 0 km
serão recalculadas automaticamente com a geocodificação corrigida.
```

