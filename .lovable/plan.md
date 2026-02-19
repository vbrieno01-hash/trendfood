

# Corrigir erro no botao "Gerenciar assinatura"

## Problema

O botao "Gerenciar assinatura" no SettingsTab chama a Edge Function `customer-portal`, que busca o cliente no Stripe pelo e-mail. Quando nao existe um cliente Stripe (caso de ativacao manual ou teste), a funcao retorna o erro "No Stripe customer found", que e exibido como toast generico ao usuario.

## Solucao

Tratar o erro especifico "No Stripe customer found" no frontend com uma mensagem amigavel e redirecionar o usuario para a pagina de planos, ja que sem registro no Stripe nao ha assinatura real para gerenciar.

## Detalhes tecnicos

### Arquivo: `src/components/dashboard/SettingsTab.tsx`

Na funcao `handleManageSubscription`, dentro do bloco catch, verificar se a mensagem de erro contem "No Stripe customer found" e exibir uma mensagem mais clara:

```typescript
} catch (err: unknown) {
  const error = err as { message?: string };
  const msg = error.message ?? data?.error ?? "";
  if (msg.includes("No Stripe customer found")) {
    toast.error("Nenhuma assinatura encontrada. Assine um plano para gerenciar sua assinatura.");
    navigate("/planos");
  } else {
    toast.error(msg || "Erro ao abrir portal de assinatura.");
  }
}
```

Tambem ajustar o tratamento do `data.error` que vem da resposta da funcao (atualmente o erro vem dentro de `data.error`, nao como excecao do `supabase.functions.invoke`):

```typescript
if (data?.error) {
  if (data.error.includes("No Stripe customer found")) {
    toast.error("Nenhuma assinatura encontrada. Assine um plano para gerenciar.");
    navigate("/planos");
    return;
  }
  throw new Error(data.error);
}
```

Apenas um arquivo precisa ser alterado. A mudanca e pequena e localizada no bloco try/catch existente.
