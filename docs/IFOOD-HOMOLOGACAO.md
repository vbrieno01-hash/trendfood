# Homologação iFood — TrendFood

**Aplicativo:** TrendFood (distribuído)
**CNPJ:** 66.067.207/0001-91
**Tipo:** Sistema de gestão (PDV / KDS) com integração ao Pedido iFood (Order API v3)
**Contato técnico:** suporte@trendfood.site

---

## 1. Visão geral

TrendFood é um SaaS de gestão para restaurantes (catálogo, KDS, comandas, delivery próprio). A integração com iFood permite ao lojista:

- Receber pedidos do iFood diretamente na produção (KDS) do TrendFood
- Confirmar (DELIVERY/TAKEOUT) dentro do SLA
- Cancelar pedidos com motivos validados pela API iFood
- Manter o status sincronizado quando o lojista também mexe no Portal/App iFood

## 2. Arquitetura

```
iFood Polling API (events:polling, /acknowledgment)
        │
        ▼ (cron 60s)
 Edge Function: ifood-poll-events
        │
        ├──► Insere em public.ifood_event_log (UNIQUE por ifood_event_id)
        ├──► Cria/atualiza public.orders (com flag ifood_synced_externally)
        └──► Chama /acknowledgment em lote

iFood Webhook (opcional, push)
        │
        ▼
 Edge Function: ifood-webhook
        │
        ├──► Mesmo dedup + persistência
        └──► Responde 202 + chama /acknowledgment

UI do lojista (KDS / Vendas)
        │
        ▼
 Edge Function: ifood-update-status (confirma, despacha, cancela)
        │
        └──► Trigger SQL evita loop ao receber o eco do mesmo status do iFood
```

## 3. Endpoints e Edge Functions

| Função | Path iFood consumido | Propósito |
|---|---|---|
| `ifood-auth` | `POST /authentication/v1.0/oauth/token` | Login client_credentials, refresh automático |
| `ifood-poll-events` | `GET /order/v1.0/events:polling` + `POST /events/acknowledgment` | Coleta eventos a cada 60 s e confirma em lote |
| `ifood-webhook` | recebe push do iFood, chama `/events/acknowledgment` | Caminho push (quando habilitado pelo iFood) |
| `ifood-update-status` | `POST /orders/{id}/confirm`, `/dispatch`, `/requestCancellation` | Atualiza status do pedido na API iFood |
| `ifood-cancellation-reasons` | `GET /orders/{id}/cancellationReasons` | Busca motivos válidos antes do cancelamento |

## 4. Mapeamento de status

| iFood (event.code) | TrendFood (orders.status) | Ação |
|---|---|---|
| `PLC` (Placed) | `pending` | Cria pedido + dispara alarme no KDS |
| `CFM` (Confirmed) | `preparing` | Marca como aceito |
| `RPR` (Ready for Pickup) | `ready` | Marca como pronto |
| `DSP` (Dispatched) | `out_for_delivery` | Saiu para entrega |
| `CON` (Concluded) | `delivered` | Entregue |
| `CAN` (Cancelled) | `cancelled` | Remove itens + grava motivo |
| `HANDSHAKE_*` | log + alerta | Plataforma de Negociação (alertamos lojista) |

## 5. Deduplicação

- Tabela `public.ifood_event_log` possui **`UNIQUE INDEX ifood_event_log_event_id_uniq` em `ifood_event_id`**
- Inserts duplicados retornam conflito e são silenciosamente ignorados
- Garante idempotência mesmo em reentregas do iFood (polling + webhook simultâneos)

## 6. Sincronização externa (anti-loop)

Quando o pedido vem alterado de fora (iFood Portal, app iFood Gestor de Pedidos):

1. `ifood-poll-events` detecta a mudança e atualiza `orders.status` setando `ifood_synced_externally = true`
2. Trigger `tg_orders_ifood_status_sync` lê essa flag e **não chama** `ifood-update-status` de volta
3. Flag é resetada para `false` em qualquer mudança originada pelo lojista

Resultado: zero loop entre TrendFood e iFood.

## 7. Cancelamento

- A UI dispara `ifood-cancellation-reasons` para listar os motivos válidos do pedido específico
- O lojista escolhe o motivo, e `ifood-update-status` envia o `cancellationCode` real
- Não usamos código hardcoded — sempre buscamos da API

## 8. Confirmação no SLA

- `PLC` recém-criado já entra em `pending` no KDS com alarme contínuo
- Lojista clica em "Aceitar" → `ifood-update-status` chama `POST /orders/{id}/confirm` em DELIVERY/TAKEOUT
- Latência típica medida: < 5 s entre `PLC` chegar e o KDS abrir o card

## 9. Retry / idempotência

- Polling roda a cada 60 s via `pg_cron` (`select cron.schedule('ifood-poll', '* * * * *', ...)`)
- `/acknowledgment` é chamado em lote ao final de cada ciclo de polling
- Falhas individuais por orgId são logadas em `ifood_event_log.payload` e não interrompem outras lojas

## 10. Campos enriquecidos extraídos do payload

- **Bandeira do cartão e troco:** `payments[].card.brand`, `payments[].changeFor`
- **Cupom:** diferenciamos `IFOOD` vs `MERCHANT` em `benefits[].sponsorshipValues`
- **CPF/CNPJ + código de coleta:** `customer.documentNumber`, `pickupCode`
- **Observações de itens:** `items[].observations` concatenadas no nome do item para impressão

## 11. Como o analista iFood pode validar

1. Crie um pedido teste no merchant homologado
2. Abra a aba **Integração iFood** no TrendFood — o evento `PLC` aparece em "Últimos eventos" com `event.id` único
3. Aceite o pedido no KDS — chamada `POST /orders/{id}/confirm` é feita
4. Mude o status no Portal iFood — TrendFood reflete sem loop
5. Cancele de qualquer um dos lados — motivos válidos são apresentados

---

_Documento gerado em 14/05/2026. Versão da integração: 1.0._