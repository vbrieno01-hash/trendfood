## Objetivo
Forçar o **Cenário 4 (Aceitar/Recusar Cancelamento)** no dashboard, fazendo aparecer os botões verdes/vermelhos no card iFood da aba Cozinha, para testar o fluxo de UI antes da gravação.

## Pedido alvo
Único pedido iFood ativo no momento:

```text
order_id  : 2d9602e6-da68-498e-bbfe-89b84469da03
ifood_id  : ce6becd8-76e9-49e8-92fd-77088f42ffb7
status    : pending
```

## Como funciona o gatilho
O `IFoodOrderChip` mostra o painel laranja **"Cliente pediu cancelamento" + Aceitar / Recusar** quando:
- `orders.ifood_cancellation_requested_at IS NOT NULL`
- `status != 'cancelled'`

(Em produção, isso é preenchido pelo `ifood-webhook` quando recebe `CONSUMER_CANCELLATION_REQUESTED` / `CCAN` / `CANR`.)

## Passo único
Rodar um UPDATE simulando que o iFood enviou a solicitação:

```sql
UPDATE orders
   SET ifood_cancellation_requested_at = now()
 WHERE id = '2d9602e6-da68-498e-bbfe-89b84469da03';
```

Realtime já está ligado em `orders` → o card vai atualizar sozinho na tela em ~1 s, com o painel laranja e botões **Aceitar** / **Recusar**.

## O que esperar ao clicar
Os botões chamam a edge function `ifood-handle-cancellation`, que faz POST real no iFood:

| Botão | Endpoint iFood | Resultado local |
|---|---|---|
| Aceitar | `POST /order/v1.0/orders/{id}/requestCancellation` (code 501) | status → `cancelled`, sai da Cozinha |
| Recusar | `POST /order/v1.0/orders/{id}/denyCancellation` | timestamp limpo, painel some |

⚠️ **Atenção:** como a solicitação **não foi feita pelo cliente real**, o iFood pode responder 400 ("no cancellation request to deny" / "order is not in cancellation request state"). Nesse caso o toast vermelho aparece mas o fluxo de UI já fica gravado — o que vale para a homologação é mostrar os botões reagindo ao evento e o POST sendo enviado.

Para uma gravação "limpa" sem erro do iFood, o ideal é pedir ao próprio iFood (canal de homologação) para disparar um `CONSUMER_CANCELLATION_REQUESTED` em um pedido de teste — o resto do fluxo já está pronto. Mas para validar visualmente agora, o UPDATE acima é suficiente.

## Próximo passo
Aprovar para eu executar o UPDATE e você ver os botões aparecerem no card.