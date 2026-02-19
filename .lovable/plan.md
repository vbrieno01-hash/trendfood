

# Corrigir tratamento do erro "No Stripe customer found" no botao Gerenciar assinatura

## Problema encontrado

O botao "Gerenciar assinatura" esta mostrando a mensagem generica "Edge Function returned a non-2xx status code" em vez da mensagem amigavel. Isso acontece porque:

1. A Edge Function `customer-portal` retorna status HTTP 500 com body `{"error":"No Stripe customer found"}`
2. O SDK do Supabase interpreta status 500 como erro e coloca um `FunctionsHttpError` no campo `error` da resposta
3. Na linha 44, o codigo faz `if (error) throw error`, jogando direto para o `catch`
4. No `catch`, a mensagem do erro e generica ("Edge Function returned a non-2xx status code"), nao contem "No Stripe customer found"
5. Por isso, o codigo cai no `else` e mostra a mensagem generica

## Solucao

Ajustar o `handleManageSubscription` para, antes de dar throw no erro, verificar se o `data` contem a mensagem especifica. Quando a Edge Function retorna 500, o SDK ainda popula o campo `data` com o body da resposta. Entao devemos verificar `data?.error` ANTES de `if (error) throw error`.

### Arquivo: `src/components/dashboard/SettingsTab.tsx`

Reordenar a logica para:

```typescript
const { data, error } = await supabase.functions.invoke("customer-portal", {
  headers: { Authorization: `Bearer ${session?.access_token}` },
});

// Verificar data.error PRIMEIRO (mesmo com status 500, data pode conter o body)
if (data?.error) {
  if (data.error.includes("No Stripe customer found")) {
    toast.error("Nenhuma assinatura encontrada. Assine um plano para gerenciar.");
    navigate("/planos");
    return;
  }
  throw new Error(data.error);
}

if (error) throw error;
```

A mudanca e simples: mover a verificacao de `data?.error` para ANTES da verificacao de `error` do SDK. Isso garante que, mesmo quando a funcao retorna 500, a mensagem amigavel e exibida corretamente.

