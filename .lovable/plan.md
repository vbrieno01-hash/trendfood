## Objetivo

Quando a loja estiver fechada, deixar claro **quando** ela reabre — não só o horário. Em vez de "Fechado · abre às 19:00" (que dá a impressão que é hoje), mostrar:

- "Fechada hoje · abre amanhã às 19:00" → quando hoje está marcado como fechado e abre amanhã
- "Fechada hoje · abre sexta às 19:00" → quando o próximo dia aberto não é amanhã
- "Fechado · abre às 19:00" (mantém atual) → quando ainda é hoje, antes do horário de abrir

## Mudanças

### 1. `src/lib/storeStatus.ts`
- Estender `StoreStatus` com novos campos no caso `open: false`:
  - `opensDayOffset: number` (0 = hoje, 1 = amanhã, 2+ = futuro)
  - `opensDayLabel: string | null` (ex: "amanhã", "sexta", "segunda")
- `findNextOpen()` passa a retornar `{ time, dayOffset }` em vez de só a string.
- Os 3 retornos com `opensAt` (linhas 106, 133, 137) preenchem os novos campos:
  - Linha 133 (hoje, antes do horário): `opensDayOffset: 0`, label `null`
  - Linhas 106 e 137 (próximo dia aberto): offset e label calculados a partir do dia da semana

### 2. Consumidores — formatar a mensagem
Helper único (pode ficar no próprio `storeStatus.ts`) que recebe o status e devolve a string final:
- offset 0 → `Fechado · abre às {hora}`
- offset 1 → `Fechada hoje · abre amanhã às {hora}`
- offset 2+ → `Fechada hoje · abre {dia} às {hora}`
- `reason: "break"` → mantém comportamento atual (pausa intra-dia)

Atualizar para usar o helper:
- `src/pages/UnitPage.tsx` (linhas 1096, 1128, 1800)
- `src/pages/TableOrderPage.tsx` (linha 796)
- `src/components/unit/ItemDetailDrawer.tsx` (linha 198)
- `src/hooks/useOrders.ts` (linha 197 — mensagem do toast ao tentar pedir com loja fechada)

### 3. Sem mudanças de banco/lógica de negócio
Nenhuma alteração em RLS, triggers, ou regras de bloqueio de pedido — apenas texto exibido.

## Detalhes técnicos

Cálculo do label do dia (em `America/Sao_Paulo`, consistente com `getNowInBrasilia`):
```
const DAY_LABELS = ["domingo","segunda","terça","quarta","quinta","sexta","sábado"];
// offset 1 → "amanhã"
// offset 2..6 → DAY_LABELS[(todayIndex + offset) % 7]
```

Compatibilidade: o tipo `StoreStatus` ganha campos opcionais — consumidores que ainda não usam o helper continuam funcionando lendo `opensAt`.