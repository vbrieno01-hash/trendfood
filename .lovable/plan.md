## Instrumentar `fiscal-emit-nfce` + UI e re-deployar

### 1. `supabase/functions/fiscal-emit-nfce/index.ts`
Adicionar como **primeira instrução** dentro de `Deno.serve`, antes do handler de `OPTIONS`:

```ts
console.log("[fiscal-emit-nfce] Função iniciada", {
  method: req.method,
  url: req.url,
  has_auth: !!req.headers.get("Authorization"),
  has_internal: !!req.headers.get("x-fiscal-token"),
  ts: new Date().toISOString(),
});
```

Se aparecer nos logs, Gateway entregou. Se não aparecer, problema é antes do runtime (deploy/roteamento/JWT). Mantém o envelope `200 { ok:false, code, message, detail }` já existente.

### 2. `src/components/dashboard/OrderFiscalActions.tsx` — função `emit`
- Quando `supabase.functions.invoke` retornar `error`, logar `name`, `message`, `status` (de `error.status` ou `error.context.status`), `context` inteiro e `data`.
- Mapear mensagem por status: 404 → "Função não encontrada (verifique deploy)"; 401 → "Não autorizado (sessão expirada?)"; 504 → "Gateway timeout"; default → `error.message`.
- Quando `data.ok === false`, logar objeto de negócio completo (`code`, `message`, `detail`).

### 3. Re-deploy
Forçar re-deploy apenas de `fiscal-emit-nfce`.

### 4. Validação
- `curl` POST `/fiscal-emit-nfce` sem body → esperado `200 { ok:false, code:"unauthorized" }` + log `[fiscal-emit-nfce] Função iniciada` no painel.
- Confirmar via `edge_function_logs` que o log de entrada apareceu.
- Devolver a bola ao usuário para testar pela UI.

### Fora de escopo
Publicar app, retry automático, refatorar demais funções fiscais.