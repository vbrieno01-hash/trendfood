
# Impressão automática para pedidos online (UnitPage / WhatsApp)

## Problema

O fluxo de pedido online (`/unidade/slug`) envia apenas uma mensagem de WhatsApp. O pedido nunca entra no banco, portanto o listener Realtime da cozinha nunca dispara e nada é impresso.

## Solução

Ao confirmar o pedido no checkout da `UnitPage`, além de abrir o WhatsApp, o sistema também insere o pedido no banco de dados. O listener Realtime da cozinha já existente recebe o INSERT e dispara a impressão automaticamente — sem nenhuma mudança na tela da cozinha.

## Fluxo após a mudança

```text
Cliente online monta carrinho
        │
        ▼
Clica "Enviar Pedido via WhatsApp"
        │
        ├─── abre WhatsApp com a mensagem ← (já existe)
        │
        └─── INSERT no banco (orders + order_items)
                    │
                    ▼
            Realtime dispara na cozinha
                    │
                    ▼
            Auto-print do comprovante ← (já existe)
```

## Detalhe: número de mesa para pedidos delivery

A tabela `orders` exige um `table_number` (inteiro). Pedidos online de delivery não têm mesa. A convenção adotada é `table_number = 0`, e o comprovante exibirá **"ENTREGA"** em vez de "MESA 0".

## Arquivos afetados

| Arquivo | O que muda |
|---|---|
| `src/pages/UnitPage.tsx` | Chama `usePlaceOrder` após o envio do WhatsApp para salvar o pedido no banco |
| `src/lib/printOrder.ts` | Quando `table_number === 0`, exibe `ENTREGA` no lugar de `MESA 0` |
| `src/pages/KitchenPage.tsx` | Label "ENTREGA" quando `table_number === 0` nos cards da cozinha |
| `src/components/dashboard/KitchenTab.tsx` | Idem no painel do dashboard |

## Como ficará o comprovante de entrega

```text
┌──────────────────────┐
│    BURGUER DO REI    │
│  ────────────────────│
│  ENTREGA   19/02 — 14:32
│  ────────────────────│
│  2x  X-Burguer       │
│  1x  Batata Frita    │
│  ────────────────────│
│  Obs: sem cebola     │
└──────────────────────┘
```

## Considerações técnicas

- O `usePlaceOrder` já existe em `src/hooks/useOrders.ts` e funciona com qualquer `tableNumber`, incluindo `0`.
- A inserção ocorre **em paralelo** com a abertura do WhatsApp — não bloqueia nem atrasa o envio da mensagem.
- Se o popup da impressora for bloqueado pelo navegador, o botão manual de impressão na tela da cozinha cobre esse cenário.
- Nenhuma migração de banco é necessária — `table_number = 0` já é válido pelo schema atual (`integer`, sem constraint de mínimo).
- O `buyerName` (nome do cliente informado no checkout) será incluído nas observações (`notes`) do pedido para identificação na cozinha: ex. `"João Silva · PIX · Rua das Flores 10"`.
