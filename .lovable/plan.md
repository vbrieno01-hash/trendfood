
## Plano: Agendamento de Pedidos

### Visão geral
Permitir que o cliente escolha um horário futuro para receber ou retirar o pedido. O lojista habilita/desabilita a funcionalidade e define os intervalos permitidos. O horário agendado aparece no pedido (notas, impressão, WhatsApp e cozinha).

### Regras
- Funcionalidade opcional por loja (campo `scheduling_config` na tabela `organizations`)
- Intervalos de 30 min baseados no horário de funcionamento da loja
- Horário mínimo: 30 min a partir de agora (configurável)
- Se agendamento estiver ativo, o cliente pode escolher "O mais rápido possível" ou um horário específico
- Pedidos agendados entram no sistema normalmente, mas exibem o horário na cozinha/impressão

### Mudanças

| Arquivo | Mudança |
|---------|---------|
| **Migration SQL** | Adicionar coluna `scheduling_config` (jsonb, default null) na tabela `organizations` — ex: `{ enabled: true, min_advance_minutes: 30, slot_interval: 30 }` |
| `src/pages/UnitPage.tsx` | Adicionar seletor de horário no checkout (após tipo de pedido). Gera slots com base no `business_hours` da loja. Inclui `AGENDADO:HH:mm` no campo `notes` do pedido |
| `src/components/dashboard/SettingsTab.tsx` | Adicionar toggle para ativar agendamento + campo de antecedência mínima no painel do lojista |
| `src/components/dashboard/KitchenTab.tsx` | Exibir badge com horário agendado no card do pedido (extraído do `notes`) |
| `src/pages/KitchenPage.tsx` | Mesmo badge de horário agendado |
| `src/lib/whatsappNotify.ts` | Incluir horário agendado na mensagem de aceite se presente |
| `src/lib/formatReceiptText.ts` | Incluir horário agendado no recibo impresso |

### Fluxo do cliente
1. Abre o checkout
2. Escolhe "Entrega" ou "Retirada"
3. Se agendamento habilitado, aparece seletor: "🕐 Agora" ou horários disponíveis (ex: 19:00, 19:30, 20:00...)
4. Horário é incluído no pedido e visível na cozinha

### Formato no `notes`
```
TIPO:Entrega|CLIENTE:João|TEL:(11) 99999|AGENDADO:19:30|PGTO:PIX
```

### Detalhes técnicos
- Os slots são gerados client-side a partir do `business_hours` da loja, filtrando horários passados e respeitando a antecedência mínima
- `scheduling_config` é um jsonb simples na tabela `organizations` (sem nova tabela)
- Se `scheduling_config` for null ou `enabled: false`, o seletor não aparece
- Pedidos agendados usam status `pending` normal — a ordenação na cozinha pode usar o horário agendado para priorizar
