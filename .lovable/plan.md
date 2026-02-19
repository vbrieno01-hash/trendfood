
# Corrigir tratamento do erro "No Stripe customer found"

## Problema

O SDK do Supabase, ao receber status 500 da Edge Function, coloca `null` em `data` e um objeto `FunctionsHttpError` em `error`. Por isso, `data?.error` nunca e alcancado e o codigo cai no `catch` com a mensagem generica "Edge Function returned a non-2xx status code".

## Solucao

Importar `FunctionsHttpError` do SDK e, dentro do bloco `try`, quando houver `error`, verificar se e uma instancia de `FunctionsHttpError`. Se for, extrair o body da resposta com `await error.context.json()` e checar a mensagem especifica.

## Detalhes tecnicos

### Arquivo: `src/components/dashboard/SettingsTab.tsx`

1. Adicionar import no topo:
```typescript
import { FunctionsHttpError } from "@supabase/supabase-js";
```

2. Reescrever o tratamento de erro no `handleManageSubscription`:

```typescript
const { data, error } = await supabase.functions.invoke("customer-portal", {
  headers: { Authorization: `Bearer ${session?.access_token}` },
});

if (error) {
  if (error instanceof FunctionsHttpError) {
    const errorBody = await error.context.json();
    if (errorBody?.error?.includes("No Stripe customer found")) {
      toast.error("Nenhuma assinatura encontrada. Assine um plano para gerenciar.");
      navigate("/planos");
      return;
    }
    throw new Error(errorBody?.error || "Erro ao abrir portal.");
  }
  throw error;
}

if (data?.url) {
  window.open(data.url, "_blank");
}
```

3. O bloco `catch` continua tratando erros inesperados normalmente.

Esta e a correcao definitiva: em vez de tentar ler `data.error` (que e `null` em respostas 500), lemos o body real da resposta a partir de `error.context.json()`.
