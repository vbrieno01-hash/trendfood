
# Corrigir logica invertida do modo PIX no checkout

## Problema

No arquivo `src/components/checkout/PixPaymentScreen.tsx`, linha 42, a variavel `hasGateway` esta configurada como `pixConfirmationMode === "direct"`, mas o modo "Direto" significa que o pedido vai direto pra cozinha e o PIX e apenas informativo (QR Code estatico). O gateway so deve ser usado no modo "Automatico" (`automatic`).

Isso causa o erro "Erro ao gerar cobranca" para qualquer loja que esteja no modo "Direto", porque o sistema tenta chamar a Edge Function `verify-pix-payment` sem ter credenciais de gateway configuradas.

## Mudanca

### `src/components/checkout/PixPaymentScreen.tsx`

- **Linha 42**: Trocar `pixConfirmationMode === "direct"` por `pixConfirmationMode === "automatic"`

Isso faz com que:
- **Direto**: Gera QR Code estatico via `generate-pix-payload`, pedido vai direto pra cozinha
- **Manual**: Gera QR Code estatico, mostra botao "Ja paguei", lojista confirma manualmente
- **Automatico (API)**: Cria cobranca via gateway (`verify-pix-payment`), faz polling do status (`check-pix-status`)

### Nenhuma alteracao no banco de dados

Apenas correcao de uma condicional no frontend.
