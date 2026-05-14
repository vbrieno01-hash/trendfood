# Plano — Homologação iFood (5 cenários para gravação)

Pontos importantes antes de tudo:

- **Quem cria os pedidos é o iFood, não o TrendFood.** Os 5 cenários são **simulados pelo iFood** (Merchant Simulator / app de teste do iFood) usando o merchant homologado. O TrendFood **recebe** via `ifood-poll-events` (cron 1 min) ou pelo botão **"Forçar polling"** na aba Integração iFood.
- Toda a lógica para os 5 cenários já está implementada (ver `supabase/functions/ifood-poll-events/index.ts`, `ifood-update-status`, `ifood-cancellation-reasons`). Só faltam **3 ajustes pequenos de UI** para a gravação ficar 100% legível.

---

## Parte 1 — Ajustes pequenos no app antes de gravar

Esses ajustes são **só de UI/leitura** (não mudam regra de negócio nem schema) e existem para o vídeo mostrar com clareza o que o analista pede.

### A) Mostrar o `orderId` do iFood no card do KDS / Vendas
Hoje o `orderId` aparece só na aba **Integração iFood → Últimos eventos**. Adicionar um chip "iFood #DISPLAYID • orderId: …" no topo do card quando `orders.gateway_payment_id` começar com `ifood:`. Permite que o analista veja o orderId no mesmo frame em que aceita/cancela.

Arquivos: `src/components/dashboard/KitchenTab.tsx`, `src/components/dashboard/OperationsTab.tsx` (e/ou `WaiterTab.tsx`) — só leitura do campo já existente.

### B) Destacar AGENDADO no card
O parser já grava `AGENDADO:<datetime>` em `orders.notes` (linha 79–84 de `ifood-poll-events`). Hoje aparece misturado com as outras meta. Adicionar um badge amarelo "Agendado p/ DD/MM HH:mm" no topo do card quando essa chave existir. Cobre o requisito do **Cenário 1** ("data e horário do agendamento visíveis na tela").

Arquivo: mesmo lugar do item A. Função utilitária em `src/lib/` para extrair `AGENDADO:` do `notes`.

### C) Botão "Copiar orderId" no card
Hoje só existe na lista de eventos. Replicar no card do pedido para a gravação mostrar o copy + colar no chamado iFood.

> **Nada disso altera edge functions, banco, RLS ou comportamento de cobrança/produção.** É só renderização de campos que já estão na linha do `orders`.

---

## Parte 2 — Roteiro de gravação dos 5 cenários

Para cada cenário, seguir a mesma estrutura de vídeo:
1. Abrir aba **Integração iFood** (mostra "Conectado" + cron rodando).
2. Disparar o cenário no **Merchant Simulator do iFood** (não no TrendFood).
3. Clicar **"Forçar polling"** (sem esperar o cron de 1 min) — vídeo curto.
4. Mostrar o pedido aparecendo no KDS, com `orderId` visível (ajuste A).
5. Executar a ação esperada (aceitar / cancelar / despachar).
6. Mostrar a aba **Últimos eventos** com o `event.id` correspondente (prova de ACK).
7. Copiar `orderId` (ajuste C) — vai no texto do chamado.

### Cenário 1 — Pedido AGENDADO com voucher `VOUCHER_ENTGRATIS`
- Simulador iFood: criar pedido com `orderTiming = SCHEDULED`, data = amanhã, voucher `VOUCHER_ENTGRATIS`.
- TrendFood: card aparece com badge **"Agendado p/ ..."** (ajuste B) e linha `CUPOM: IFOOD -R$ X` (já implementado, linha 61–77).
- Aceitar → `POST /orders/{id}/confirm`.

### Cenário 2 — Pedido manual + cartão na entrega + cancelamento
- Simulador iFood: criar pedido com `payment.method = CREDIT/DEBIT` e `prepaid = false` (pagamento na entrega).
- TrendFood: card mostra `PGTO: CREDIT` + `BANDEIRA: VISA` (linhas 51–57).
- Cancelar pelo botão do card → UI chama `ifood-cancellation-reasons` (busca motivos válidos da API), usuário escolhe um motivo, `ifood-update-status` envia `requestCancellation` com o `cancellationCode` real (não hardcoded).

### Cenário 3 — Pedido para retirada (TAKEOUT)
- Simulador iFood: `orderType = TAKEOUT`.
- TrendFood: `TIPO: Retirada` + `COLETA: <pickupCode>` (linhas 47–49).
- Fluxo completo: aceitar (`/confirm`) → marcar pronto (`/readyToPickup`) → marcar retirado (`/dispatch` ou `/concluded` conforme já mapeado em `ifood-update-status`).

### Cenário 4 — Cancelamento iniciado pela Plataforma de Negociação (HANDSHAKE)
- Simulador iFood: dispara evento `HANDSHAKE_DISPUTE` ou `CAN` originado do iFood.
- TrendFood: `ifood-poll-events` recebe o `CAN` externo, `syncExternalStatus` (linha 264–283) marca `orders.status = cancelled` e `ifood_synced_externally = true` (não dispara loop). Card pinta "Cancelado via iFood".
- ⚠️ **Atenção (gap conhecido):** o checklist da `IFoodHomologacaoTab` marca **HANDSHAKE_*** como **"partial"** (resposta automática ainda manual). Para esse cenário específico **basta demonstrar a recepção, log do evento e o cancelamento refletido no KDS** — é o que o requisito pede ("Notificação e tratamento do cancelamento"). Não precisa responder ao HANDSHAKE no vídeo.

### Cenário 5 — Pagamento em dinheiro com troco + observação + CPF/CNPJ
- Simulador iFood: `payment.method = CASH`, `payment.cash.changeFor = 100`, `customer.documentNumber = <CPF>`, `extraInfo = "sem cebola"`, item com `observations`.
- TrendFood: card mostra `PGTO: CASH`, `TROCO: R$ 100,00`, `CPF: ...`, `OBS: sem cebola`, e o item com `| Obs: ...` (já implementado em `buildOrderNotes` + `buildItemName`, linhas 18–103).

---

## Parte 3 — Após a gravação

1. Para cada vídeo, copiar do card o `orderId` e colar no chamado iFood no formato pedido (uma linha por cenário).
2. Anexar os 5 vídeos no chamado.
3. Marcar na aba **Homologação iFood** do admin os itens que foram demonstrados ao vivo (apenas referência interna).

---

## O que **NÃO** vai ser feito neste plano

- Nenhuma mudança em `supabase/functions/ifood-*` (já cobrem os 5 cenários).
- Nenhuma mudança em `supabase/migrations/`, `.env`, `package.json`, `vite.config.ts`, `supabase/config.toml`.
- Nenhuma mudança em fluxo de pagamento, cobrança, RLS ou autenticação.
- HANDSHAKE automático fica fora de escopo (continua manual conforme checklist atual).

## Detalhes técnicos (resumo)

- Recepção: `ifood-poll-events` (cron 1 min) + botão "Forçar polling" em `IFoodTab.tsx`.
- Dedup: `UNIQUE INDEX ifood_event_log_event_id_uniq`.
- Anti-loop: coluna `orders.ifood_synced_externally` + trigger `tg_orders_ifood_status_sync`.
- Cancelamento: `ifood-cancellation-reasons` → `ifood-update-status` com `cancellationCode` real da API.
- Campos já parseados: troco, bandeira, CPF/CNPJ, pickupCode, observações, voucher iFood vs Loja, AGENDADO.
