## Problema

Ao clicar em **"Forçar polling"** na aba iFood, retorna `500: {"error":"Unexpected end of JSON input"}`.

Causa, vista no log da edge function `ifood-poll-events` (linha 332 do `index.ts`):

```
Poll error: SyntaxError: Unexpected end of JSON input
  at Response.json (...)
  at handler (.../ifood-poll-events/index.ts:332:38)
```

A API do iFood (`/events/v1.0/events:polling`) responde com **HTTP 200 + corpo vazio** (ou `204 No Content`) quando não há eventos novos. O código atual chama `eventsRes.json()` direto, o que estoura em corpo vazio e derruba todo o polling — nenhum org é processado nessa chamada.

## Correção (1 arquivo, mudança mínima)

`supabase/functions/ifood-poll-events/index.ts`, no bloco que hoje faz `const events = await eventsRes.json();` (linha 335):

1. Tratar `204 No Content` como "sem eventos" (continua o loop com `events: 0`).
2. Ler o corpo como texto primeiro; se vier vazio ou só whitespace, tratar como `[]`.
3. Envolver o `JSON.parse` em try/catch para, em caso de payload inválido, registrar `parse_error` para aquele org e seguir para o próximo, em vez de derrubar a função inteira.

Pseudo-diff:

```ts
if (eventsRes.status === 204) {
  results.push({ org: cred.organization_id, events: 0 });
  continue;
}

const raw = (await eventsRes.text()).trim();
let events: any[] = [];
if (raw.length > 0) {
  try {
    const parsed = JSON.parse(raw);
    events = Array.isArray(parsed) ? parsed : [];
  } catch {
    results.push({ org: cred.organization_id, error: "invalid_json" });
    continue;
  }
}
if (events.length === 0) {
  results.push({ org: cred.organization_id, events: 0 });
  continue;
}
```

Resto do fluxo (ack, dedup, processamento de eventos) permanece igual.

## Fora de escopo

- Não mexer em `ifood-webhook`, KDS, `IFoodOrderChip` nem na allowlist de e-mails.
- Não alterar config de `verify_jwt` nem secrets.

## Verificação

1. Deploy automático da função.
2. Clicar em **"Forçar polling"** na aba iFood (`/dashboard?tab=ifood`).
3. Esperado: resposta 200 com `results: [{ org: ..., events: 0 }]` quando não há pedidos novos, sem `Unexpected end of JSON input` nos logs.
