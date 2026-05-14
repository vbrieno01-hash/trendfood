## Objetivo

Transformar a aba **Integração iFood** (hoje só com Merchant ID + lista de eventos vazia) num painel de homologação completo, e gerar a documentação técnica para anexar ao ticket no iFood Developer Portal.

## Fase 4 — UI no `IFoodTab.tsx`

### 4.1 Painel "Status de Homologação"
Card no topo (acima de Conexão) com checklist visual dos 11 requisitos do iFood, cada item com badge verde/amarelo/vermelho:

```text
[✓] Polling 30s + /acknowledgment
[✓] Confirmação DELIVERY/TAKEOUT no SLA
[✓] Cancelamento com /cancellationReasons
[✓] Bandeira do cartão + troco
[✓] Cupom (iFood vs Loja)
[✓] CPF/CNPJ + código de coleta
[✓] Observações de itens
[✓] Dedup por event.id
[✓] Sincronização externa (CFM/RPR/DSP/CAN)
[~] Plataforma de Negociação (HANDSHAKE_*)
[✓] Webhook responde + ACK
```

Cada item expansível com 1-2 linhas explicando como está implementado (útil pro analista do iFood validar).

### 4.2 Botão "Baixar documentação"
Gera/baixa o arquivo `IFOOD-HOMOLOGACAO.md` (Fase 5) pronto pra anexar no ticket.

### 4.3 Botão "Abrir ticket no iFood"
Link externo direto pro Developer Portal com instruções curtas (qual categoria escolher, o que escrever).

### 4.4 Seção "Últimos eventos" — melhorar
- Mostrar `event.id`, tipo, orderId, timestamp, status processado
- Badge "duplicado ignorado" quando o dedup atuou
- Botão "Reprocessar" por evento (chama `ifood-poll-events` manualmente)

### 4.5 Modal de motivos de cancelamento
Quando usuário cancela um pedido iFood em `SalesItem.tsx`, abrir modal que:
1. Chama `ifood-cancellation-reasons` pra buscar os motivos válidos da API
2. Lista radios com os motivos
3. Envia o `cancellationCode` real pro `ifood-update-status`

(substitui o hardcoded `"501"` atual)

## Fase 5 — Documentação

Criar `docs/IFOOD-HOMOLOGACAO.md` cobrindo:

1. **Visão geral** — TrendFood, CNPJ, app distribuído
2. **Arquitetura** — polling + webhook, edge functions envolvidas, fluxo de evento
3. **Endpoints implementados** — lista com método, path, propósito
4. **Códigos de status** — mapeamento iFood ↔ TrendFood (PLC→pending, CFM→preparing, etc.)
5. **Deduplicação** — UNIQUE index em `ifood_event_log.ifood_event_id`
6. **Sincronização externa** — flag `ifood_synced_externally` evita loop
7. **Cancelamento** — uso de `/cancellationReasons` + códigos reais
8. **Retry/idempotência** — política de retry, ACK em lote
9. **Payloads de exemplo** — PLC, CFM, CAN, HANDSHAKE_*
10. **Como testar** — passos pro analista validar

## Arquivos afetados

- `src/components/dashboard/IFoodTab.tsx` — painel de status, botões, eventos enriquecidos
- `src/components/dashboard/CancelOrderModal.tsx` (novo) — modal de motivos
- `src/components/dashboard/SalesItem.tsx` — disparar modal quando pedido for iFood
- `docs/IFOOD-HOMOLOGACAO.md` (novo) — documentação completa
- `public/docs/IFOOD-HOMOLOGACAO.md` (cópia) — pra download via link

## Fora do escopo

- Tratamento completo de `HANDSHAKE_*` (fica como "parcial" no checklist; só logamos + Telegram alert, não automatizamos a negociação)
- Mudança no backend (Fases 1-3 já estão prontas)
