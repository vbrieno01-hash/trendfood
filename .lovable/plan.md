

## Transferir organização "Chapa e Alho" para a conta chapaealho.2025@gmail.com

### Situação atual
- Conta **raquel.morr.10@gmail.com** (user_id: `5a343082...`) → dona da org "Chapa e Alho"
- Conta **chapaealho.2025@gmail.com** (user_id: `dee8e1ab...`) → existe mas sem organização

### O que será feito
Atualizar o `user_id` da organização "Chapa e Alho" para apontar para a conta `chapaealho.2025@gmail.com`. Isso transfere toda a loja (cardápio, pedidos, configurações, cupons, etc.) para o novo login.

### Dados transferidos
- Organização e todas as configurações
- Cardápio completo
- Histórico de pedidos
- Cupons, entregadores, estoque
- Device tokens (push notifications) — precisam ser re-registrados no novo login

### SQL a executar (via insert tool)
```sql
UPDATE organizations 
SET user_id = 'dee8e1ab-6734-47a1-8618-9150150a8344' 
WHERE id = '59922bf2-20ab-4f2d-a243-7c462150b4e4';
```

### Resultado
- Login com **chapaealho.2025@gmail.com** → acessa a loja "Chapa e Alho" normalmente
- Login com **raquel.morr.10@gmail.com** → não terá mais loja vinculada

Nenhuma alteração de código necessária — apenas atualização de dados.

