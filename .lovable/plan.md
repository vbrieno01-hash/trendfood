

## Plano: Melhorar robustez do envio WhatsApp (sem confirmação manual)

### Problema
As funções `notifyCustomerWhatsApp` e `notifyCustomerReady` usam `window.open` direto, que falha silenciosamente quando o popup é bloqueado. O operador não sabe se funcionou ou não.

### Solução
Manter o fluxo atual (abrir wa.me), mas:
1. Usar `openWhatsAppWithFallback` para detectar popup bloqueado e mostrar botão alternativo
2. Mostrar toast de sucesso/fallback para o operador saber se abriu ou não

### Alterações

**`src/lib/whatsappNotify.ts`**
- Importar `openWhatsAppWithFallback` de `./whatsappRedirect`
- Substituir `window.open(url, "_blank", "noopener,noreferrer")` por `openWhatsAppWithFallback(url)` em ambas as funções (`notifyCustomerWhatsApp` e `notifyCustomerReady`)
- Isso garante que se o popup for bloqueado, aparece um toast com botão "Abrir WhatsApp" em vez de falhar silenciosamente

### Resultado
- Zero mudança no fluxo do operador (continua abrindo wa.me automaticamente)
- Se popup for bloqueado: toast com botão manual aparece por 30s
- Operador sempre sabe se a mensagem foi aberta ou não
- 1 arquivo alterado, 2 linhas substituídas

