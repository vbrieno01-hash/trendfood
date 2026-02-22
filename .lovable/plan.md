
# Adicionar QR Code PIX no cupom impresso

## O que muda

Hoje o QR Code PIX so aparece no modo navegador quando alguem passa o `pixPayload` manualmente - mas ninguem passa. O cupom sai sempre sem QR.

A ideia e: se a loja tem chave PIX configurada e o pedido tem valor > 0, gerar o QR Code automaticamente no cupom.

## Como funciona

O projeto ja tem a funcao `buildPixPayload` (em `src/lib/pixPayload.ts`) que monta o payload EMV/PIX a partir da chave PIX, valor e nome da loja - tudo client-side, sem precisar chamar o backend.

## Alteracoes

### 1. KitchenTab.tsx - Passar pixPayload nas impressoes

Onde `printOrderByMode` e chamado com `undefined` no lugar do pixPayload, gerar o payload usando `buildPixPayload` quando a org tem `pix_key`.

- Adicionar prop `pixKey` ao componente
- Importar `buildPixPayload`
- Calcular o total do pedido e gerar o payload antes de chamar `printOrderByMode`

### 2. KitchenPage.tsx - Mesma logica

A pagina standalone da cozinha (`/kds`) tambem chama `printOrderByMode` com `undefined`. Aplicar a mesma correcao.

- Buscar `pix_key` da org (ja disponivel no hook `useOrganization`)
- Gerar payload antes de imprimir

### 3. DashboardPage.tsx - Passar pixKey para KitchenTab

Passar a prop `pixKey` da organizacao para o componente KitchenTab.

### 4. useOrders.ts - QR na fila automatica

Na funcao `usePlaceOrder`, o pedido e enfileirado automaticamente para impressao. Adicionar parametro opcional `pixKey` para gerar o payload e inclui-lo no texto da fila.

Porem, a fila de impressao e texto puro (32 colunas). QR Code nao pode ser renderizado em texto. Entao o QR so aparecera nos modos **navegador** e **Bluetooth** (que suportam comandos ESC/POS de imagem). Para a fila de texto (desktop), o cupom continuara sem QR - isso e limitacao do formato.

## Resumo

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/dashboard/KitchenTab.tsx` | Receber `pixKey`, gerar payload e passar para `printOrderByMode` |
| `src/pages/KitchenPage.tsx` | Buscar `pix_key` da org, gerar payload e passar para `printOrderByMode` |
| `src/pages/DashboardPage.tsx` | Passar `pixKey` como prop para `KitchenTab` |
| `src/components/dashboard/WaiterTab.tsx` | Gerar payload e passar para `printOrder` |

O QR Code aparecera automaticamente no cupom impresso pelo navegador, com o valor exato do pedido. O cliente escaneia e paga direto.
