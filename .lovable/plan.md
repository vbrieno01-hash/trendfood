# Revisão do checklist de homologação iFood

Mapeei cada cenário do iFood contra o que está implementado hoje no Trendfood (edges `ifood-webhook`, `ifood-poll-events`, `ifood-handle-cancellation`, `ifood-cancel-order` e UI da Cozinha).

## Cenário 1 — Pedido agendado com voucher VOUCHER_ENTGRATIS
**Status: OK**
- `buildOrderNotes()` já detecta `orderTiming === "SCHEDULED"` e grava `AGENDADO:<dataHora>` em `orders.notes`.
- `benefits[].sponsorshipValues` é parseado e salvo como `CUPOM:IFOOD -R$X; LOJA -R$Y`.
- `OrderMetadataDisplay` e `ThermalReceipt` já leem `agendado` e exibem a data/hora.
- **Ação no vídeo:** abrir o pedido no KDS/Cozinha → mostrar chip "Agendado para …" + linha CUPOM. Anotar `orderId` (UUID interno) e o `displayId` do iFood.

## Cenário 2 — Pedido manual, cartão na entrega, cancelado
**Status: OK** (após o último fix)
- Novo pedido entra normal via webhook; `payment_method` = `CREDIT`/`DEBIT` e `BANDEIRA:` vai pra notes.
- Botão "Cancelar pedido iFood" chama `ifood-cancel-order` com `force=true` → aceita `pending/preparing/ready/delivered/awaiting_payment` e usa `/cancellationReasons` (não hardcoded).
- **Ação no vídeo:** receber pedido → cancelar pelo botão na Cozinha → mostrar status `cancelled` + log no `ifood_event_log`.

## Cenário 3 — Pedido para retirada (TAKEOUT)
**Status: OK**
- `orderType === "TAKEOUT"` ⇒ `ifood_order_type = "TAKEOUT"`, sem criar `delivery`.
- `notes` recebe `TIPO:Retirada` + `COLETA:<pickupCode>`.
- KDS exibe chip "Retirada" via `IFoodOrderChip`.
- Fluxo PLC → CFM (confirm) → RPR (preparing) → RTP (ready) → CON (concluded) todos mapeados em `EXTERNAL_STATUS_MAP`.
- **Ação no vídeo:** seguir todas as etapas até "Pronto para retirada" e "Concluído".

## Cenário 4 — Cancelamento iniciado pela Plataforma de Negociação
**Status: OK com ressalva v1**
- Webhook trata `CCAN/CONSUMER_CANCELLATION_REQUESTED/CANR/CANCELLATION_REQUESTED` setando `ifood_cancellation_requested_at` → KDS mostra alerta "Cliente solicitou cancelamento" com botões Aceitar/Recusar.
- `ifood-handle-cancellation` chama `/requestCancellation` ou `/denyCancellation`.
- Se a API responder "Negotiation platform is only available in version 2", a edge marca local e instrui o lojista a confirmar no app iFood (caminho legítimo na v1).
- **Ressalva (item "partial" da aba):** resposta automática a `HANDSHAKE_*` ainda é manual — apenas logada e notificada via Telegram. Para homologação, basta demonstrar que o evento chegou + a decisão do lojista (Aceitar/Recusar) saiu do nosso sistema.

## Cenário 5 — Dinheiro com troco + observação + CPF/CNPJ
**Status: OK**
- `payments[].cash.changeFor` → `TROCO:R$X` em notes.
- `customer.documentNumber` (11 ou 14 dígitos) → `CPF:` ou `CNPJ:`.
- `extraInfo` do pedido → `OBS:` em notes.
- `items[].observations` → concatenadas no nome do item via `buildItemName()`.
- Tudo é exibido via `OrderMetadataDisplay` na Cozinha e impresso no `ThermalReceipt`.
- **Ação no vídeo:** abrir o pedido → mostrar troco, OBS e CPF/CNPJ na tela; opcionalmente imprimir a comanda.

## Resumo
| Cenário | Suporte no código | Risco |
|--------|-----|------|
| 1 — Agendado + voucher | ✅ | nenhum |
| 2 — Manual + cancelar | ✅ | nenhum (após fix recente) |
| 3 — Retirada | ✅ | nenhum |
| 4 — Cancelamento da plataforma | ✅ (com fallback v2→manual no app iFood) | médio: se o pedido vier por Negotiation v2, a confirmação final é no app iFood — explicar isso na gravação |
| 5 — Dinheiro/troco/obs/CPF | ✅ | nenhum |

## Recomendação
Não há alteração de código necessária para passar nos 5 cenários. O único ponto a explicitar no chamado é o cenário 4: nosso sistema **recebe e exibe** a solicitação e **dispara** a decisão; quando o iFood exigir a Plataforma de Negociação v2, o lojista finaliza no app iFood — comportamento já documentado na nossa edge.

Se quiser, no próximo passo eu posso:
1. Atualizar a aba "Homologação iFood" no admin com este mapeamento por cenário (texto + status), pra você usar como guia ao gravar os vídeos.
2. Adicionar um botão "Copiar orderId iFood + interno" em cada pedido pra colar direto no chamado.

Me confirma se topa esses 2 ajustes (ou só um) que eu implemento.
