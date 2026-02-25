

# Plano: Garantir que `paymentMethod` é salvo em todos os fluxos da plataforma

## Diagnóstico

O fix anterior corrigiu apenas o fluxo de **delivery/retirada** no `UnitPage.tsx` (pedidos online via WhatsApp). Porém, existe outro ponto de criação de pedidos:

### Já corrigido
- **`UnitPage.tsx` — fluxo PIX** (linha 322): passa `paymentMethod: "pix"` e `paid: false`
- **`UnitPage.tsx` — fluxo não-PIX** (linha 411): agora passa `paymentMethod` e `paid: false` (fix recente)

### Ainda pendente
- **`TableOrderPage.tsx` — pedidos de mesa** (linha 228): o `placeOrder.mutateAsync` NÃO passa `paymentMethod` nem `paid`. Resultado: todos os pedidos de mesa ficam com `payment_method: "pending"` no banco

No `TableOrderPage`, o pagamento é selecionado **depois** do pedido ser criado (na tela de sucesso), mas o método escolhido nunca é salvo de volta no banco via update. O `setPaymentMethod` na linha 267 apenas controla o estado local para exibir a tela de PIX/cartão, sem persistir no banco.

## Alcance da correção

Como todas as lojas da plataforma compartilham o mesmo código-fonte (`UnitPage.tsx` e `TableOrderPage.tsx`), a correção é automática para todas as unidades. Não existe código por loja — tudo é multi-tenant via `organization_id`.

## O que será feito

### `src/pages/TableOrderPage.tsx`

1. **Salvar `paymentMethod` no banco quando o cliente escolhe o método de pagamento** (~linha 266-290):
   - Na função `handleSelectPayment`, após o `setPaymentMethod(method)`, fazer um update no pedido para salvar `payment_method` no banco
   - Usar `supabase.from("orders").update({ payment_method: method }).eq("id", orderId)`

2. **Para o modo "direct" (sem PIX automático)**, onde o pagamento é no balcão:
   - Quando o cliente seleciona "card", salvar `payment_method: "card"` 
   - Quando o cliente seleciona "pix", salvar `payment_method: "pix"`

## Seção técnica

```text
Arquivo: src/pages/TableOrderPage.tsx

Mudança — função handleSelectPayment (linha 266):
  const handleSelectPayment = async (method: "pix" | "card") => {
    setPaymentMethod(method);
+   // Persist payment method to database
+   if (orderId) {
+     await supabase
+       .from("orders")
+       .update({ payment_method: method })
+       .eq("id", orderId);
+   }
    ...resto existente...
  };
```

Isso garante que o `payment_method` é salvo no banco para TODOS os fluxos:
- UnitPage delivery/retirada PIX → "pix"
- UnitPage delivery/retirada Dinheiro/Cartão → "dinheiro"/"cartão de débito"/etc
- TableOrderPage mesa PIX → "pix"  
- TableOrderPage mesa Cartão → "card"

