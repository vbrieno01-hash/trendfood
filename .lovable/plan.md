

## Dois problemas a corrigir

### 1. Banco de dados: preço do plano Grátis
O `price_cents` do plano `free` continua `0`. Precisa ser atualizado para `500` (R$ 5) para permitir testes de pagamento.

**SQL**: `UPDATE platform_plans SET price_cents = 500 WHERE key = 'free';`

### 2. Código: erro genérico no CardPaymentForm
Quando `create-mp-subscription` retorna status 400, o Supabase client define `error` com mensagem genérica ("Edge Function returned a non-2xx status code") e `data` fica `null`. O código atual faz `if (error && !data) throw new Error(error.message)`, perdendo a mensagem real do servidor.

**`src/components/checkout/CardPaymentForm.tsx`** — Alterar a invocação para usar `throwOnError: false` (se suportado) ou tratar o corpo da resposta diretamente. A forma mais simples: usar `fetch` direto para a edge function em vez de `supabase.functions.invoke`, ou capturar o JSON de erro do response. A abordagem recomendada:

Usar a opção do Supabase SDK que não lança exceção em non-2xx, extraindo o JSON de erro:
```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-mp-subscription`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ org_id: orgId, plan, card_token_id: tokenResult.id }),
  }
);
const data = await response.json();
if (!response.ok || data?.error) {
  const errorMsg = getMpErrorMessage(data?.status_detail || data?.message || data?.error);
  throw new Error(errorMsg);
}
```

Isso garante que mesmo respostas 400 tenham o corpo JSON lido e a mensagem real exibida ao usuário.

### Resultado
- O plano Grátis terá preço R$ 5 para teste
- Erros de pagamento mostrarão a mensagem real (ex: "Não é possível criar assinatura para plano grátis") em vez do genérico "Edge Function returned a non-2xx status code"

