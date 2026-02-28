
# Plano: Corrigir edge function `create-mp-payment`

## Problema
A edge function usa `supabase.auth.getClaims(token)` que não existe na versão `@supabase/supabase-js@2.49.1`. Erro: `TypeError: supabase.auth.getClaims is not a function`.

## Correção

### Editar `supabase/functions/create-mp-payment/index.ts`

Substituir o bloco `getClaims` (linhas 34-42) por `supabase.auth.getUser()`:

```typescript
const { data: userData, error: userError } = await supabase.auth.getUser();
if (userError || !userData?.user) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
const userId = userData.user.id;
const userEmail = userData.user.email!;
```

Remove a linha `const token = authHeader.replace("Bearer ", "");` que não será mais necessária.
