

## Plano: Agendamento de Pedidos

### Visão geral
Permitir que o cliente escolha um horário futuro para receber ou retirar o pedido. O lojista habilita/desabilita a funcionalidade e define a antecedência mínima. O horário agendado aparece no pedido (notas, impressão, WhatsApp e cozinha).

### Fluxo do cliente
1. Abre o checkout e escolhe "Entrega" ou "Retirada"
2. Se agendamento habilitado, aparece seletor: "🕐 O mais rápido possível" ou horários disponíveis (19:00, 19:30, 20:00...)
3. Horário é salvo no campo `notes` do pedido e visível em todos os canais

### Mudanças

| Arquivo | Mudança |
|---------|---------|
| **Migration SQL** | Adicionar coluna `scheduling_config` (jsonb, default null) na tabela `organizations` |
| `src/components/dashboard/SettingsTab.tsx` | Toggle para ativar agendamento + campo de antecedência mínima (em minutos) |
| `src/pages/UnitPage.tsx` | Seletor de horário no checkout — gera slots de 30 min a partir do horário de funcionamento, filtra passados, inclui `AGENDADO:HH:mm` no `notes` |
| `src/components/dashboard/KitchenTab.tsx` | Badge com horário agendado no card do pedido |
| `src/pages/KitchenPage.tsx` | Mesmo badge de horário agendado |
| `src/lib/whatsappNotify.ts` | Incluir horário agendado na mensagem de aceite |
| `src/lib/formatReceiptText.ts` | Incluir horário agendado no recibo impresso |

### Formato no `notes`
```text
TIPO:Entrega|CLIENTE:João|AGENDADO:19:30|PGTO:PIX
```

### Detalhes técnicos
- `scheduling_config` jsonb: `{ enabled: boolean, min_advance_minutes: number }` — sem nova tabela
- Slots gerados client-side a partir do `business_hours` da loja
- Se config null ou `enabled: false`, seletor não aparece
- Pedidos agendados usam status `pending` normal

