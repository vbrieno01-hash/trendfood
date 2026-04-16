

## Corrigir destino do botão "Voltar para o início"

### Problema
O botão atual leva para `/unidade/{slug}` (cardápio público da loja). O correto é voltar para a **tela de identificação da mesa** — onde o cliente informa quantas pessoas estão e os nomes.

### Solução
A tela de identificação é a fase inicial da própria `TableOrderPage` (quando `setupDone === false`). Em vez de navegar para outra rota, o botão deve **resetar o estado** para voltar à etapa de identificação da mesma mesa.

### Mudança em `src/pages/TableOrderPage.tsx`
Substituir os 8 botões "Voltar para o início" para chamar uma função que:
- Limpa o sucesso e o carrinho (`setSuccess(false)`, `setCart({})`, `setNotes("")`)
- Reseta a identificação (`setSetupDone(false)`, `setPeopleCount(1)`, `setPeopleNames([""])`, `setActivePerson(0)`)
- Limpa cupom e dados de pagamento (`setAppliedCoupon(null)`, `setPaymentMethod(null)`, `setOrderId(null)`)

Texto sugerido: **"Voltar para identificação da mesa"** (mais claro que "início").

### Resultado
Cliente clica → volta para a tela onde escolhe quantas pessoas e digita os nomes da mesma mesa, sem sair para o cardápio público.

