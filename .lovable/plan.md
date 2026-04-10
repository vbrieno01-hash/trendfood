

## Corrigir webhook para aceitar requisições de teste do iFood

### Problema
O portal iFood enviou uma requisição de teste ao webhook, mas com body vazio (ou GET), causando `SyntaxError: Unexpected end of JSON input` na linha `await req.json()`.

### Solução
Ajustar `supabase/functions/ifood-webhook/index.ts` para:
1. Responder `200 OK` a requisições `GET` (health check do iFood)
2. Tratar body vazio graciosamente em vez de crashar no `req.json()`

### Alteração em `supabase/functions/ifood-webhook/index.ts`
- Adicionar tratamento para `GET` retornando 200
- Envolver `req.json()` em try/catch para body vazio, retornando 200 com mensagem amigável
- Reimplantar a edge function

### Resultado esperado
O portal iFood vai mostrar "Validação OK" ao testar, e eventos reais (pedidos) continuarão sendo processados normalmente.

