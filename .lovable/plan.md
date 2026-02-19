
# Adicionar data na impressão do pedido

## Problema

Em `src/lib/printOrder.ts`, linha 13, só a hora é formatada:

```typescript
const time = new Date(order.created_at).toLocaleTimeString("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});
```

Isso gera algo como `14:32` no comprovante, sem a data.

## Solução

Adicionar a data junto à hora, formatando como `19/02 — 14:32`. Uma única linha extra:

```typescript
const date = new Date(order.created_at).toLocaleDateString("pt-BR", {
  day: "2-digit",
  month: "2-digit",
});

const time = new Date(order.created_at).toLocaleTimeString("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

// No HTML:
<span class="time">${date} — ${time}</span>
```

## Arquivo afetado

| Arquivo | O que muda |
|---|---|
| `src/lib/printOrder.ts` | Adiciona variável `date` e inclui no HTML do comprovante |

## Como ficará no comprovante

```
┌──────────────────────┐
│    BURGUER DO REI    │
│  ────────────────────│
│  MESA 5    19/02 — 14:32
│  ────────────────────│
│  2x  X-Burguer       │
│  1x  Batata Frita    │
└──────────────────────┘
```

Mudança mínima, sem impacto em nenhum outro arquivo.
