

## Diagnóstico: "Erro ao carregar pagamento"

O toast "Erro ao carregar pagamento" vem do `CardPaymentForm.tsx` (linha 62) quando a chamada `supabase.functions.invoke("get-mp-public-key")` retorna erro. Os auth logs mostram múltiplos erros "Session not found" para uma sessão antiga, o que indica que o token JWT pode estar expirado/inválido no momento da chamada, fazendo a edge function retornar 401.

### Causa provável

Quando o usuário tem uma sessão expirada ou o auto-refresh falha, o `supabase.functions.invoke` envia um token inválido. A edge function `get-mp-public-key` faz `supabase.auth.getUser()` que falha, retornando 401. O `invoke` trata isso como `error`, disparando o toast.

### Correções

**1. `src/components/checkout/CardPaymentForm.tsx`**
- Antes de chamar `get-mp-public-key`, verificar se existe uma sessão válida com `supabase.auth.getSession()`
- Se a sessão estiver expirada, tentar `supabase.auth.refreshSession()` antes de invocar a function
- Melhorar o log de erro para incluir detalhes (status, message) para debug futuro
- Adicionar retry automático (1 tentativa) caso o primeiro invoke falhe

**2. `src/components/checkout/CardPaymentForm.tsx` (erro handling)**
- Diferenciar erro de autenticação (sessão expirada) de erro de configuração (chave ausente)
- Para erro de sessão: mostrar toast "Sessão expirada. Faça login novamente."
- Para outros erros: manter a mensagem atual

### Resumo da mudança

```tsx
// Antes de invocar get-mp-public-key:
const { data: sessionData } = await supabase.auth.getSession();
if (!sessionData?.session) {
  toast.error("Sessão expirada. Faça login novamente.");
  return;
}
// Então invoca normalmente, com retry se falhar
```

