

## Auditoria End-to-End: Erros Silenciosos Restantes

Após revisão completa de todos os arquivos críticos (AuthPage, UnitPage, TableOrderPage, PixPaymentScreen, useOrders, useAuth, useDeliveryFee, usePixAutomation), identifiquei **4 erros silenciosos** que ainda existem no código.

---

### Problema 1: `handlePixSuccess` — update sem await e sem verificação de erro

**Arquivo:** `src/pages/UnitPage.tsx` linha 437

```typescript
// ATUAL — fire-and-forget, pode falhar silenciosamente
supabase.from("orders").update({ paid: true, status: "pending" }).eq("id", orderId);
```

O update do pedido após pagamento PIX não tem `await` nem verificação de erro. Se falhar (rede instável, timeout), o pedido fica como "awaiting_payment" para sempre — a cozinha nunca recebe.

**Correção:** Adicionar `await` e log de erro.

---

### Problema 2: `handleSelectPayment` — updates sem verificação de erro

**Arquivo:** `src/pages/TableOrderPage.tsx` linhas 266-270

```typescript
await supabase.from("orders").update({ payment_method: method, status: "pending" } as never).eq("id", orderId);
```

Dois `update()` chamam `.eq("id", orderId)` mas ignoram o `{ error }` retornado. Se o RLS rejeitar (anon user), o pedido nunca muda de status — silenciosamente.

**Correção:** Verificar `error` e mostrar toast.

---

### Problema 3: `handlePixSuccess` — `window.open()` fora de gesto do usuário

**Arquivo:** `src/pages/UnitPage.tsx` linha 476

O `handlePixSuccess` é chamado por um `useEffect` quando `paid` muda (não por click do usuário). O `window.open()` dentro dele será **bloqueado** por Safari/Samsung Internet/Firefox mobile. O WhatsApp nunca abre após pagar PIX.

**Correção:** Usar `window.location.href` como método principal (não é bloqueado por popup blockers) em vez de `window.open()`, já que o usuário vai sair da página de qualquer forma.

---

### Problema 4: `createCharge` no `useCreatePixCharge` — estado não reseta entre chamadas

**Arquivo:** `src/hooks/usePixAutomation.ts`

Se o usuário cancela o PIX e tenta novamente, o hook mantém o `data` e `error` da chamada anterior. O `useEffect` em `PixPaymentScreen` (linha 42-47) depende de `[orderId]` — se o mesmo orderId for reutilizado, o effect não re-executa e o QR Code não é gerado novamente.

**Correção:** Resetar `data` e `error` ao início de cada `createCharge`.

---

### Resumo das correções

| Arquivo | Linha | Problema | Impacto |
|---------|-------|----------|---------|
| UnitPage.tsx | 437 | Update sem await/error check | Pedido PIX pago nunca chega na cozinha |
| TableOrderPage.tsx | 266-270 | Update sem error check | Pagamento selecionado mas pedido trava |
| UnitPage.tsx | 476 | window.open fora de gesto | WhatsApp não abre após PIX no mobile |
| usePixAutomation.ts | 16-46 | Estado não reseta entre chamadas | QR Code não regenera se tentar novamente |

### Detalhes técnicos
- Zero mudanças no banco de dados
- Zero mudanças em edge functions
- Todas as correções são defensivas (await, error check, fallback)
- Foco em compatibilidade mobile (Safari, Samsung Internet, Firefox)

