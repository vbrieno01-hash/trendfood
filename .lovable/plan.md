

## Problema encontrado

O botão "Usar minha localização" foi adicionado ao componente `AddressFields.tsx`, que é usado pelo `CheckoutPage.tsx`. Porém, o checkout **real** que o cliente vê é o drawer dentro do `UnitPage.tsx` (rota `/unidade/:slug`), que tem seus próprios campos de endereço inline -- sem usar `AddressFields`. O `CheckoutPage.tsx` **não é importado em nenhum lugar da aplicação**.

Ou seja, o botão GPS existe no código mas **nunca aparece** para o cliente.

## Solução

Adicionar o botão "Usar minha localização" diretamente na seção de endereço do `UnitPage.tsx`, dentro do bloco `{orderType === "Entrega" && (...)}`, reutilizando a edge function `reverse-geocode` que já está deployada.

### Alterações

**`src/pages/UnitPage.tsx`**:
1. Adicionar estados `gpsLoading` e `gpsError`
2. Criar função `handleGetLocation()` que chama `navigator.geolocation.getCurrentPosition()` → `reverse-geocode` → preenche `customerAddress`
3. Adicionar botão "Usar minha localização" com ícone `LocateFixed` logo antes do campo CEP (dentro do bloco de Entrega, linha ~1052)
4. Importar `LocateFixed` do lucide-react

A lógica é idêntica à do `AddressFields.tsx` -- chamar a edge function e mapear o resultado para o estado `customerAddress`.

