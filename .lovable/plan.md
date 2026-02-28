

# Sim, foi apenas um teste

O redirecionamento para a página do Mercado Pago aconteceu porque adicionei uma lógica de "fallback sandbox" que desvia do checkout transparente quando detecta credenciais de teste. Isso foi um erro meu.

## Plano: Reverter o fallback e manter o checkout transparente

### Alterações

1. **`supabase/functions/create-mp-subscription/index.ts`**
   - Remover a variável `isSandbox`
   - Sempre enviar `card_token_id` quando fornecido, com `status: "authorized"` (sandbox ou produção)
   - Remover `sandbox_redirect` da resposta

2. **`src/components/checkout/CardPaymentForm.tsx`**
   - Remover o bloco que verifica `sandbox_redirect` e faz `window.open`

### Resultado
O checkout transparente funcionará normalmente em ambos os ambientes. Se o Mercado Pago rejeitar o token, o erro aparece na própria interface sem redirecionamento.

