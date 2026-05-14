## Problema
Ao clicar **Aceitar** no painel laranja, a edge function `ifood-handle-cancellation` chama `POST /requestCancellation` no iFood e recebe:

```
400 BAD_REQUEST: "Order ce6becd8... is already cancelled"
```

Esse pedido já foi cancelado no iFood em testes anteriores (lixeira), então qualquer nova chamada de cancelamento/aceite/recusa nele falha — não é bug do fluxo, é estado obsoleto do pedido de teste.

## Correção (mesma lógica que já está em `ifood-cancel-order`)
Aplicar tolerância a "already cancelled" também em `supabase/functions/ifood-handle-cancellation/index.ts`:

- Se a resposta do iFood for **400 + body contém "already cancelled"**:
  - Logar evento `OUT_CANCEL_ACCEPT_ALREADY` / `OUT_CANCEL_DENY_ALREADY` em `ifood_event_log`.
  - Marcar `orders.status = 'cancelled'` e limpar `ifood_cancellation_requested_at`.
  - Retornar **200 `{ success: true, already_cancelled_at_ifood: true }`** em vez de 502.

Isso faz o card sumir da Cozinha mesmo quando o iFood já cancelou o pedido por timeout/teste anterior.

## Para gravar o cenário 4 (homologação)
O pedido `2d9602e6...` está queimado no iFood (já cancelado). Para gravação real:

1. Criar/disparar **novo pedido de teste** no iFood (homologação).
2. Quando ele entrar como `pending`, rodar de novo o UPDATE `ifood_cancellation_requested_at = now()` para forçar o painel laranja **sem** ter cancelado antes.
3. Clicar **Aceitar** ou **Recusar** → o iFood vai aceitar a chamada e o fluxo grava limpo.

Alternativa "limpa": pedir ao iFood (canal de homologação) para enviar um `CONSUMER_CANCELLATION_REQUESTED` real em um novo pedido — assim você grava sem o UPDATE manual.

## Próximo passo
Aprovar para eu aplicar a tolerância "already cancelled" em `ifood-handle-cancellation` e fazer deploy.