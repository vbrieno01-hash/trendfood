

## Plano: Corrigir mensagem inicial ao criar conversa

### Problema
Quando você cria uma nova conversa, o código envia o prompt "Gere a primeira mensagem de abertura... Siga a REGRA 3" para a IA. Mas o prompt atual do Lucas não tem mais "REGRA 3" — ele foi reescrito com SPIN Selling. A IA não entende a instrução e gera mensagem aleatória.

### Correção
Atualizar o prompt enviado na função `generateInitialMessage` (linha 256-268 do `SalesChatTab.tsx`) para ser compatível com o prompt atual:

**De:**
```
"Gere a primeira mensagem de abertura para o cliente chamado X. Siga a REGRA 3 - apenas cumprimento curto."
```

**Para:**
```
"Gere UMA mensagem curta de abertura para o WhatsApp do cliente chamado X. Apenas cumprimento amigável de 1-2 frases, sem mencionar TrendFood, sem link, sem vender nada. Exemplo: 'Oi X! Me conta, como está o movimento aí hoje?'"
```

### Implementação
- 1 arquivo editado: `src/components/admin/SalesChatTab.tsx`
- Apenas 2 linhas alteradas (258-260)
- Zero mudanças no banco ou edge function

