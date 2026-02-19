
# Pagamento PIX Automático para Pedidos Online (Delivery/Retirada)

## Situacao Atual

Quando o cliente pede pelo cardapio online (delivery ou retirada):
1. Ele seleciona "PIX" como forma de pagamento
2. O pedido e salvo no banco com `payment_method = 'pending'`
3. A mensagem vai pro WhatsApp do lojista
4. **Nao ha cobranca real** -- o lojista precisa cobrar manualmente

Para mesas presenciais, o sistema ja gera QR Code PIX e verifica o pagamento automaticamente.

## O que sera feito

Quando o cliente online escolher PIX, em vez de apenas registrar no texto, o sistema vai:

1. **Gerar o QR Code PIX** com o valor total do pedido (incluindo frete se aplicavel)
2. **Exibir uma tela de pagamento** com o QR Code, codigo copia-e-cola e countdown
3. **Verificar o pagamento automaticamente** (se a loja tiver gateway PIX configurado) ou aguardar confirmacao manual
4. **Salvar o pedido com `payment_method = 'pix'`** e o status adequado
5. So enviar a mensagem pro WhatsApp **apos o pagamento ser confirmado** (ou imediatamente se for outro metodo)

## Fluxo do cliente

```text
Carrinho -> Checkout -> Seleciona PIX
                            |
                    [Gera QR Code PIX]
                            |
                  Tela de Pagamento PIX
                  (QR Code + Copia/Cola)
                            |
              [Verifica pagamento via gateway]
                            |
                   Pagamento Confirmado!
                            |
              [Salva pedido + Envia WhatsApp]
```

Para outros metodos (Dinheiro, Cartao), o fluxo continua igual ao atual.

## Detalhes tecnicos

### 1. Novo componente: `src/components/checkout/PixPaymentScreen.tsx`

- Recebe: valor total, org (para pix_key e gateway config), callback de sucesso
- Gera payload PIX usando `pixPayload.ts` (ja existe no projeto)
- Renderiza QR Code usando `qrcode.react` (ja instalado)
- Exibe codigo copia-e-cola
- Se a loja tiver gateway configurado (`organization_secrets.pix_gateway_token`): polling automatico via edge function `verify-pix-payment`
- Se nao tiver gateway: botao "Ja paguei" que marca como `awaiting_payment` para confirmacao manual do lojista
- Timer de 10 minutos com expiracao

### 2. Alteracao: `src/pages/UnitPage.tsx`

- Quando o cliente clicar "Enviar Pedido" com PIX selecionado:
  - Em vez de enviar direto, abrir o `PixPaymentScreen` em um Drawer/Dialog
  - Passar o valor total (com frete) e dados da org
  - So prosseguir com o `placeOrder.mutate()` e envio do WhatsApp apos confirmacao do pagamento
  - Salvar o pedido com `payment_method: 'pix'` em vez de 'pending'

### 3. Alteracao: `src/hooks/useOrders.ts`

- Atualizar `usePlaceOrder` para aceitar `payment_method` opcional como parametro
- Se `payment_method === 'pix'` e gateway configurado: salvar como `paid: true`
- Se `payment_method === 'pix'` sem gateway: salvar como `paid: false` + status adequado para confirmacao manual

### 4. Logica condicional por modo de confirmacao

- `pix_confirmation_mode === 'direct'` (gateway ativo): verificacao automatica, pedido ja entra como pago
- `pix_confirmation_mode === 'manual'`: pedido entra como `awaiting_payment`, garcom confirma no painel
- `pix_confirmation_mode === 'direct'` sem gateway: mostra QR estatico + botao "Ja paguei"

### Resumo de arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/checkout/PixPaymentScreen.tsx` | **Novo** -- tela de pagamento PIX |
| `src/pages/UnitPage.tsx` | Alterar fluxo de checkout quando PIX selecionado |
| `src/hooks/useOrders.ts` | Aceitar `payment_method` no `usePlaceOrder` |

### Sem mudancas no banco de dados
- A coluna `payment_method` ja existe na tabela `orders`
- A coluna `paid` ja existe
- As edge functions de verificacao PIX ja existem
