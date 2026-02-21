

# Simplificar PIX no pedido online: pagar na entrega quando nao tem gateway

## Resumo

Manter as 3 opcoes no painel do lojista (Direto, Manual, Automatico), mas no checkout online (UnitPage), so mostrar a tela de QR Code PIX quando o modo for "Automatico" (gateway configurado). Nos modos "Direto" e "Manual", o PIX funciona como dinheiro/cartao: o pedido vai direto pro WhatsApp e o cliente paga quando o motoboy chegar.

## O que muda para o cliente final

- **Modo Automatico**: Continua igual -- QR Code aparece, pagamento confirmado automaticamente antes de enviar o pedido
- **Modo Direto ou Manual**: Quando o cliente escolhe PIX, o pedido e enviado normalmente pelo WhatsApp com "PGTO: PIX". Sem tela de QR Code. O pagamento acontece na entrega

## Mudancas tecnicas

### `src/pages/UnitPage.tsx`

1. **Linhas 278-324** -- Condicional do PIX no checkout:
   - Adicionar verificacao: so entrar no fluxo do PixPaymentScreen se `org.pix_confirmation_mode === "automatic"`
   - Se o modo for "direct" ou "manual", nao criar pedido com `awaiting_payment` nem mostrar a tela PIX. Deixar o fluxo seguir normalmente (igual Dinheiro/Cartao), enviando pelo WhatsApp com `PGTO:PIX`

2. **Linha 312** -- Status inicial do pedido:
   - Atualmente esta `awaiting_payment` para todos os modos (codigo redundante). Sera removido pois so o modo automatico cria pedido nesse ponto

Nenhuma alteracao no banco de dados nem nas Edge Functions. Apenas logica condicional no frontend.

