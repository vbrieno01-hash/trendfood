## Diagnóstico

Nos logs de agora, o **mesmo `messageid`** chega **duas vezes** em menos de 1 segundo (uazapi entrega o mesmo evento repetido — comportamento conhecido em `chatSource="updated"`):

```
[whatsapp-webhook] RAW payload ... "messageid":"3EB0E588612FAD4B63ADD1" ...   (t=170265)
[whatsapp-webhook] RAW payload ... "messageid":"3EB0E588612FAD4B63ADD1" ...   (t=170273)
→ routed instance org=28083a33... (2x)
→ ai-bot-respond invocado 2x
   → 1ª chamada: provider=cerebras 200 OK
   → 2ª chamada: cerebras 429 "Requests per minute limit exceeded"
```

Resultado: o cliente **recebe a resposta duplicada** (ou uma resposta + um erro), e ainda estoura o rate limit do Cerebras à toa. Não é bug de IA — é falta de **deduplicação por `messageid`** no `whatsapp-webhook`.

Escala para todas as lojas: como o webhook é único e global, toda loja sofre a mesma duplicação.

## Correção — deduplicação idempotente por messageid

### 1. Nova tabela `wa_message_dedupe` (migration)

```sql
CREATE TABLE public.wa_message_dedupe (
  message_id TEXT PRIMARY KEY,
  instance_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.wa_message_dedupe TO service_role;
ALTER TABLE public.wa_message_dedupe ENABLE ROW LEVEL SECURITY;
-- Sem policies públicas: só service_role escreve/lê (é interno do webhook).

CREATE INDEX wa_message_dedupe_created_idx
  ON public.wa_message_dedupe (created_at);
```

Adicionar limpeza no `cleanup-old-data` (ou pg_cron dedicado): `DELETE FROM wa_message_dedupe WHERE created_at < now() - interval '24 hours'`.

### 2. Guard no `whatsapp-webhook/index.ts`

Assim que extrair `messageid` (antes de qualquer chamada a `ai-bot-respond`):

```ts
const messageId = message?.messageid || message?.id;
if (messageId) {
  const { error: dupErr } = await supabase
    .from("wa_message_dedupe")
    .insert({ message_id: messageId, instance_name: instanceName });
  if (dupErr?.code === "23505") {  // unique_violation → já processado
    console.log("[whatsapp-webhook] duplicate skipped", { messageId });
    return new Response(JSON.stringify({ ok: true, deduped: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
```

O `INSERT` com PK única garante atomicidade: se dois eventos chegam ao mesmo tempo, só um passa; o outro leva 23505 e é descartado limpo. Isso resolve tanto duplicação da uazapi quanto retries de rede.

### 3. Não mexer

- Cascata Groq → Cerebras (já está correta e global).
- Regras de skip de `fromMe`/grupo (já funcionam).
- `ai-bot-respond` (o problema é a montante).

## Critério de aceite

- Enviar 2 mensagens seguidas na wrburg → logs mostram `duplicate skipped` para as reentregas e apenas **1** `[ai-bot-respond] provider=cerebras` por mensagem real.
- Testar em uma segunda loja (mcd/gb) → mesmo comportamento.
- Zero `cerebras 429` causados por chamada duplicada da mesma mensagem.

Aprovar pra eu implementar?
