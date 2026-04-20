
## Diagnóstico — bug crítico de timezone

A função `getNowInBrasilia()` em `src/lib/storeStatus.ts` aplica o offset de timezone **duas vezes** quando o cliente não está em UTC. Como praticamente todo lojista/cliente está em GMT-3 (Brasília), o cálculo fica **3 horas atrasado** na maioria dos dispositivos.

### O bug, em código

```ts
function getNowInBrasilia(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;  // converte p/ UTC ms
  return new Date(utcMs + (-3) * 3600_000);                         // subtrai 3h
}
// Depois o código faz: result.getHours() / result.getDay()
// Mas .getHours() APLICA o timezone local de novo!
```

### O que acontece na prática

| Cliente em | "Hora real" BRT | `getNowInBrasilia` retorna | `.getHours()` lê |
|---|---|---|---|
| UTC (servidor) | 04:48 | 04:48 UTC | **04** ✅ |
| Brasília (-3) | 04:48 | 04:48 UTC | 04 - 3 = **01** ❌ |
| Lisboa (0/UTC) | 04:48 | 04:48 UTC | **04** ✅ |
| Brasília no horário 22:00 | 22:00 | 22:00 UTC | **19** ❌ |

Os testes não pegaram porque rodam em UTC (offset = 0), onde a aplicação dupla é zero.

### Por que aparece como "loja aberta quando deveria estar fechada"

Se a loja abre 18:00 e fecha 22:00, e o cliente está em Brasília acessando às 22:30:
- Hora real BRT: 22:30 → loja **fechada**
- `getNowInBrasilia` calcula: 22:30 - 3h = **19:30** → dentro do horário → **loja aberta** ❌

Cobre exatamente o que os clientes estão reclamando: lojas mostrando aberto fora do horário (especialmente à noite/madrugada, quando o atraso de 3h "puxa" o relógio pra dentro do horário comercial).

O mesmo bug existe duplicado em `src/pages/UnitPage.tsx` linha 373 (função `generateTimeSlots`).

A função SQL `validate_store_open_for_order` no banco está **correta** (usa `AT TIME ZONE 'America/Sao_Paulo'`), por isso o pedido é bloqueado pelo backend ao confirmar — mas a UI já enganou o cliente que clicou em "Adicionar ao carrinho" e só descobre que tá fechado lá no fim.

## Solução

Trocar a implementação por uma que use a API nativa correta (`Intl.DateTimeFormat` com timezone `America/Sao_Paulo`), que **funciona em qualquer dispositivo** independente do fuso e respeita horário de verão se houver.

### Mudança em `src/lib/storeStatus.ts`

```ts
function getNowInBrasilia(): { dayOfWeek: number; hour: number; minute: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    dayOfWeek: weekdayMap[get("weekday")] ?? 0,
    hour: parseInt(get("hour"), 10) || 0,
    minute: parseInt(get("minute"), 10) || 0,
  };
}
```

E ajustar o uso interno (era `now.getDay()`, `now.getHours()`, `now.getMinutes()`) para os campos do objeto retornado.

### Mudança em `src/pages/UnitPage.tsx` (linha 373)

Mesma correção dentro de `generateTimeSlots`.

### Atualizar testes

`src/test/storeStatus.test.ts` — refatorar os mocks pra usar `vi.setSystemTime(new Date(isoUtcString))` direto (a nova função faz a conversão certa internamente, então `mockDate("2026-03-04T01:30:00")` vira `new Date("2026-03-04T04:30:00Z")` representando 01:30 BRT em UTC).

## Checagem extra

Verifiquei o trigger SQL `tr_validate_store_open` no banco — está **ativo** e usa `AT TIME ZONE 'America/Sao_Paulo'` corretamente. Ou seja, o backend já bloqueia pedidos fora do horário; só a UI estava dando informação errada. A correção alinha a UI com o que o backend já valida.

## Arquivos a editar

- `src/lib/storeStatus.ts` — substituir `getNowInBrasilia` por versão com `Intl.DateTimeFormat` e ajustar referências internas
- `src/pages/UnitPage.tsx` — corrigir `generateTimeSlots` (linha ~373)
- `src/test/storeStatus.test.ts` — ajustar helper `mockDate` pra nova semântica
