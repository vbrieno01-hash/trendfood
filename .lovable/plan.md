

## Plano: Botão "Usar minha localização" (GPS) no Checkout

### Problema
Alguns clientes não sabem o CEP nem o endereço completo de onde moram. A busca por CEP não resolve se a pessoa simplesmente não sabe o CEP.

### Solução
Adicionar um botão **"Usar minha localização"** no `AddressFields` que usa a **Geolocation API** do navegador para pegar as coordenadas GPS do cliente e faz **geocodificação reversa** (coordenadas → endereço) via Nominatim na edge function, preenchendo todos os campos automaticamente.

### Alterações

**1. Nova edge function `reverse-geocode/index.ts`**
- Recebe `{ lat, lon }` no body
- Chama Nominatim reverse geocoding: `https://nominatim.openstreetmap.org/reverse?lat=X&lon=Y&format=json`
- Extrai rua, bairro, cidade, estado e CEP do resultado
- Retorna os campos estruturados para o frontend

**2. Atualizar `src/components/checkout/AddressFields.tsx`**
- Adicionar botão "Usar minha localização" com ícone `Navigation`/`LocateFixed` acima ou ao lado do campo CEP
- Ao clicar: `navigator.geolocation.getCurrentPosition()` → pega lat/lon → chama a edge function `reverse-geocode` → preenche todos os campos (rua, bairro, cidade, estado, CEP)
- Estados de loading e erro (permissão negada, GPS indisponível)
- O cliente pode editar/corrigir os campos preenchidos depois

### Fluxo do usuário
1. Cliente abre checkout → clica "Usar minha localização"
2. Navegador pede permissão de localização
3. GPS retorna coordenadas → edge function faz reverse geocoding
4. Campos de endereço são preenchidos automaticamente
5. Cliente ajusta número/complemento se necessário

### Componentes afetados
- `src/components/checkout/AddressFields.tsx` — botão GPS + lógica de geolocation
- `supabase/functions/reverse-geocode/index.ts` — nova edge function

