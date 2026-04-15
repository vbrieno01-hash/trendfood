

## Mostrar badge "PENDENTE" nos pedidos não pagos na Cozinha

### Situação atual
A cozinha já mostra badges de pagamento (PIX, Cartão), mas **esconde** o badge quando `payment_method === "pending"`. Ou seja, pedidos do Balcão com pagamento pendente chegam na cozinha **sem nenhuma indicação** de que ainda não foram pagos.

### Solução
Inverter a lógica: em vez de esconder o badge para `pending`, mostrar um badge vermelho/amarelo **"💰 PENDENTE"** para que a cozinha saiba que o cliente ainda não pagou.

### Alterações

**`src/components/dashboard/KitchenTab.tsx`** — 2 locais (Pendentes ~linha 499 e Preparando ~linha 644):
- Trocar a condição que filtra `payment_method !== "pending"` para incluir todos os métodos
- Adicionar caso para `"pending"`: badge amarelo/vermelho com texto "PENDENTE"
- Manter os badges existentes (PIX verde, Cartão azul, Dinheiro)

**`src/components/dashboard/WaiterTab.tsx`** — 2 locais (~linhas 312 e 452):
- Mesma lógica: mostrar badge "PENDENTE" quando `payment_method === "pending"`

### Resultado
A equipe da cozinha verá claramente quais pedidos de balcão ainda precisam ser cobrados, com um badge vermelho "💰 PENDENTE" ao lado do "🛒 BALCÃO".

