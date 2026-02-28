

## Diagnóstico: "Erro ao carregar configuração de pagamento"

### O que aconteceu

O `CardPaymentForm` chama a função `get-mp-public-key` quando o dialog abre. A função está funcionando corretamente (confirmado via teste direto). O erro ocorre porque o código em `CardPaymentForm.tsx` não loga o erro real — apenas exibe o toast genérico.

Possíveis causas:
- Sessão expirada ou token inválido no momento da chamada
- Resposta da função parseada incorretamente pelo SDK (campo `error` preenchido mesmo com status 200)
- O dialog foi aberto durante uma troca de sessão (de `vendass945` para `brenojackson30`)

### Alterações

**`src/components/checkout/CardPaymentForm.tsx`** (linhas 51-59):
- Adicionar `console.error` com o `error` e `data` reais para diagnosticar a causa exata
- Adicionar fallback: se `error` for null mas `data?.public_key` não existir, logar `data` inteiro
- Melhorar mensagem de erro para o usuário com mais contexto

Isso permitirá ver nos logs do console exatamente o que a função retorna e identificar a causa raiz na próxima ocorrência.
