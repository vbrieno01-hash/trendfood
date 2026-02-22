

# Corrigir link do motoboy usando dominio de producao

## Problema
O link de cadastro de motoboys usa `window.location.origin`, que na preview gera a URL `https://4930409c-...lovableproject.com/motoboy?org=julia`. Esse dominio exige login na plataforma Lovable, impedindo o acesso do motoboy.

Os outros links do sistema (mesas, loja publica, compartilhamento) ja usam a URL fixa de producao `https://trendfood.lovable.app`, mas o link do motoboy ficou usando `window.location.origin`.

## Solucao
Trocar `window.location.origin` pela constante de producao no `CourierDashboardTab.tsx`.

## Alteracao

| Arquivo | Linha | De | Para |
|---------|-------|----|------|
| `src/components/dashboard/CourierDashboardTab.tsx` | 136 | `` `${window.location.origin}/motoboy?org=${orgSlug}` `` | `` `https://trendfood.lovable.app/motoboy?org=${orgSlug}` `` |

1 linha, 1 arquivo.
