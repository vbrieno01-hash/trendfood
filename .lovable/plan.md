
# Corrigir erro "Erro ao gerar cobranca" para todos os clientes

## Problema

O erro "Erro ao gerar cobranca - Edge Function returned a non-2xx status code" aparece porque o sistema tenta chamar a Edge Function `verify-pix-payment` para lojas que nao tem gateway configurado. Isso acontece em **dois lugares** do codigo:

1. **UnitPage (pedido online)** -- Ja foi corrigido na ultima alteracao, so mostra PixPaymentScreen no modo "automatic"
2. **TableOrderPage (pedido por mesa/QR Code)** -- Ainda tem problemas:
   - Linha 215: `needsPaymentFirst` inclui o modo `"manual"`, criando pedidos com `awaiting_payment` mesmo sem gateway
   - Linha 264-272: `createCharge` e chamado corretamente so no modo "automatic", mas o QR Code estatico e exibido para **todos** os modos "manual" e "direct" via `pixPayloadFromServer`

Todas as 10 organizacoes estao no modo "direct", entao nenhuma deveria ver tela de gateway.

## Mudancas

### 1. `src/pages/TableOrderPage.tsx`

**Linha 214-216** -- Corrigir `needsPaymentFirst`:
- Mudar de `pixMode === "automatic" || pixMode === "manual"` para apenas `pixMode === "automatic"`
- No modo "direct" e "manual", o pedido entra como `pending` (vai direto pra cozinha/KDS)
- Apenas no modo "automatic" o pedido fica retido como `awaiting_payment`

**Linhas 304-311** -- Botao PIX na tela de pagamento pos-pedido (mesa):
- No modo "direct", ao clicar PIX, tratar como pagamento na entrega/na hora (igual cartao) -- atualizar status pra "pending" e mostrar confirmacao
- Manter QR Code PIX apenas nos modos "manual" e "automatic"

### 2. `src/components/checkout/PixPaymentScreen.tsx`

**Linhas 52-56** -- Remover fallback de QR Code estatico:
- Como agora o PixPaymentScreen so e usado no modo "automatic", remover a logica de gerar payload estatico (`generatePayload`) quando o gateway falhar
- Se o gateway falhar, mostrar erro com botao "Voltar" (sem tentar QR Code estatico, pois o lojista configurou gateway e espera que funcione)

**Linhas 138-151** -- Erro do gateway:
- Remover a mensagem "Usando QR Code estatico como alternativa"
- Mostrar apenas o erro e o botao Voltar

**Linhas 104-107** -- Remover botao "Ja paguei":
- Como o componente so roda no modo automatico, nao precisa de confirmacao manual

### Nenhuma alteracao no banco de dados

Apenas correcoes de logica condicional no frontend.
