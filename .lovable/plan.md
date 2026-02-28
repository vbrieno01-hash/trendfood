

# Diagnóstico: Erro "Card token service not found"

## Problema identificado
O erro **"Card token service not found"** vem do Mercado Pago e ocorre porque as credenciais estão em **modo TEST** (`TEST-774a082e-...`). No modo teste do MP, é necessário usar **contas de teste** (comprador e vendedor teste) — cartões reais não funcionam.

O código está correto, mas há dois problemas a corrigir:

## Correções necessárias

### 1. Melhorar tratamento de erro no frontend (`CardPaymentForm.tsx`)
- Quando a edge function retorna status 500, o `supabase.functions.invoke` lança erro genérico "Edge Function returned a non-2xx status code" — o detalhe do MP se perde
- Corrigir para extrair a mensagem real do `data` mesmo quando há `error`

### 2. Retornar status 200 com erro estruturado na edge function (`create-mp-subscription`)
- Em vez de retornar HTTP 500 quando o MP rejeita, retornar 200 com `{ error: ..., status_detail: ... }` para que o frontend consiga ler a mensagem
- Isso permite que o mapeamento de erros em português funcione corretamente

### 3. Adicionar mensagem específica para "Card token service not found"
- Adicionar no `mpErrorMessages.ts` uma mensagem para esse erro específico explicando que pode ser problema de credenciais teste

### Sobre produção
Quando você trocar as credenciais para **produção** (`APP_USR-...` em vez de `TEST-...`), o fluxo funcionará normalmente com cartões reais.

