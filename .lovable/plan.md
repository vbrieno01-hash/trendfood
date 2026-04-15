

## Adicionar opção "Pendente" no pagamento do Balcão

### Problema
Atualmente o Balcão só oferece Dinheiro, Cartão e PIX. Se o cliente quiser pagar depois, não há como registrar o pedido sem selecionar um pagamento. Falta a opção de "Pendente" (fiado/pagar depois).

### Alteração

**`src/components/dashboard/CounterTab.tsx`**

1. Alterar o tipo de `paymentMethod` para incluir `"pending"`:
   - `useState<"cash" | "card" | "pix" | "pending" | null>(null)`

2. Adicionar um 4o botão na grid de pagamento (mudar grid de 3 para 4 colunas):
   - Ícone: `Clock` (lucide-react)
   - Label: "Pendente"
   - Key: `"pending"`

3. Na função `handleSubmit`, quando `paymentMethod === "pending"`:
   - Enviar `paid: false`
   - Enviar `paymentMethod: "pending"`
   - Isso faz o pedido aparecer na coluna "Pagamento" após ser preparado

4. Ajustar o grid de `grid-cols-3` para `grid-cols-4` nos botões de pagamento.

### Resultado
O operador do balcão poderá registrar pedidos "fiados" que aparecerão na coluna de Pagamento para cobrança posterior.

