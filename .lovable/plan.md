

## Plano: Incluir pontos de fidelidade na mensagem WhatsApp de aceite

### Mudança
Quando o lojista aceita o pedido e a mensagem WhatsApp é enviada ao cliente, incluir uma linha informando quantos pontos ele ganhou e seu saldo total — para que o cliente saiba mesmo sem voltar ao site.

### Exemplo de mensagem
```text
🍳 *Pedido aceito!*
Estamos preparando seu pedido. Avisaremos quando estiver pronto para retirada! 😊

🎯 Você ganhou 3 pontos de fidelidade! Saldo: 8 pontos.

— Nome da Loja
```

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/whatsappNotify.ts` | Adicionar parâmetro opcional `loyaltyInfo?: { earned: number; total: number }` na função `notifyCustomerWhatsApp`. Se presente, adiciona linha com pontos ganhos e saldo |
| `src/components/dashboard/KitchenTab.tsx` | No `handleAcceptOrder`, antes de chamar `notifyCustomerWhatsApp`, buscar os pontos do cliente (via `supabase.from("loyalty_points")` usando o telefone extraído do `notes`) e a config de fidelidade da org. Calcular pontos ganhos com base no total do pedido e passar como `loyaltyInfo` |
| `src/pages/KitchenPage.tsx` | Mesma lógica do `KitchenTab.tsx` — buscar pontos e passar `loyaltyInfo` ao `notifyCustomerWhatsApp` |

### Detalhes técnicos
- O telefone já é extraído via `parsePhoneFromNotes` — reutilizamos para buscar `loyalty_points` pelo `phone_normalized`
- A config de fidelidade (`loyalty_config`) é buscada pelo `organization_id` para saber se o programa está ativo e o valor por ponto
- Se o programa não estiver ativo ou não houver dados, a linha de pontos simplesmente não aparece (sem quebrar nada)
- Os pontos já foram acumulados no momento do pedido (no checkout), então o saldo já está atualizado quando o lojista aceita

