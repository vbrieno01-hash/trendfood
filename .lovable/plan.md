
# Corrigir o bug do horário de funcionamento com fechamento à meia-noite

## Causa raiz identificada

Na função `getStoreStatus` em `src/lib/storeStatus.ts`, o cálculo de minutos trata "00:00" como 0 minutos. Quando a loja fecha à meia-noite ("00:00"), a condição de abertura falha:

```
fromMin = 900  (15:00)
toMin   = 0    (00:00 → meia-noite mal interpretada)

Verificação: currentMinutes >= 900 && currentMinutes < 0  →  IMPOSSÍVEL de ser verdadeiro
```

Isso faz a loja aparecer como fechada mesmo que seja, por exemplo, 17h — dentro do horário configurado.

## Solução

Duas correções no arquivo `src/lib/storeStatus.ts`:

### 1. Tratar "00:00" como fim do dia (1440 minutos)
Quando o horário de fechamento é "00:00" (meia-noite), deve representar o final do dia, não o início. Basta ajustar `toMin` para 1440 nesse caso.

### 2. Permitir horários que cruzam a meia-noite (ex: 22:00 às 02:00)
Se `toMin < fromMin`, significa que o horário vai além de meia-noite. A verificação precisa considerar isso.

## Mudanças em `src/lib/storeStatus.ts`

Substituir `timeToMinutes` por uma versão que aceita o contexto de "fechamento":

```typescript
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toMinutesClose(time: string): number {
  const mins = timeToMinutes(time);
  // 00:00 como horário de fechamento = meia-noite = fim do dia
  return mins === 0 ? 1440 : mins;
}
```

E atualizar a lógica de verificação:

```typescript
const fromMin = timeToMinutes(today.from);
const toMin = toMinutesClose(today.to);

// Suporte a horários que cruzam meia-noite (ex: 22:00 às 02:00)
const isOpen = toMin > fromMin
  ? currentMinutes >= fromMin && currentMinutes < toMin        // normal
  : currentMinutes >= fromMin || currentMinutes < toMin;       // cruza meia-noite
```

## Arquivo afetado

| Arquivo | O que muda |
|---|---|
| `src/lib/storeStatus.ts` | Corrige `timeToMinutes` para "00:00" e suporte a horários pós-meia-noite |

Essa correção resolve o caso do usuário (seg: 15:00 às 00:00) e também cobre futuros casos de horários que cruzam a meia-noite.
