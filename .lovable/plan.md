

# Plano: Esconder botão "Confirmar Pagamento" quando motoboy não tem chave PIX

## Problema
O botão "Confirmar Pagamento" aparece sempre que o card do motoboy é expandido e há entregas a pagar, mesmo quando o motoboy não cadastrou sua chave PIX. O QR Code já mostra um aviso "Motoboy não cadastrou chave PIX", mas o botão de confirmar continua visível — permitindo registrar pagamento sem ter como pagar.

## O que será feito

Envolver o botão "Confirmar Pagamento" (linhas 601-614) na mesma condição do QR Code: só renderizar quando `c.pix_key` existir (`pixPayload` não é null). Quando não tiver chave PIX, o aviso amarelo já existente será suficiente.

## Seção técnica

```text
Arquivo: src/components/dashboard/CourierDashboardTab.tsx
  Linha 601: envolver o <Button> "Confirmar Pagamento" com condição
    {pixPayload && ( ... )} para que só apareça quando o motoboy
    tem pix_key cadastrada.
  
  O aviso "Motoboy não cadastrou chave PIX" (linhas 594-598)
  já existe e continuará aparecendo no lugar do QR + botão.
```

