

## Plano: Adicionar técnica de auto-objeção no prompt de vendas

### O que muda
Adicionar uma seção no `SYSTEM_PROMPT` do `sales-chat/index.ts` com a técnica de **fazer o cliente responder suas próprias objeções** através de perguntas estratégicas (técnica de "reversão").

### Como funciona
Em vez de responder objeções diretamente, o Lucas faz perguntas que levam o cliente a concluir sozinho que precisa da solução.

**Exemplos de objeções e como reverter:**

| Objeção do cliente | Resposta errada (argumentar) | Resposta certa (reverter) |
|---|---|---|
| "Tá caro" | "Mas é barato comparado ao iFood" | "Entendo. Me fala, quanto você paga de taxa no iFood por mês?" |
| "Já tenho sistema" | "O nosso é melhor" | "Show! E ele resolve tudo que você precisa? Tem algo que te incomoda nele?" |
| "Vou pensar" | "Mas é uma boa oportunidade" | "Claro! Me conta, o que exatamente você quer avaliar melhor?" |
| "Não preciso" | "Mas todo mundo precisa" | "Entendo! Hoje como você organiza os pedidos que chegam?" |
| "Meu cardápio já funciona" | "Mas o nosso é digital" | "Legal! E seus clientes conseguem pedir sozinhos sem te chamar no WhatsApp?" |

### Implementação
- 1 arquivo editado: `supabase/functions/sales-chat/index.ts`
- Substituir a seção "VALIDAÇÃO E ANTECIPAÇÃO" (linha 43-45) por uma seção completa de **REVERSÃO DE OBJEÇÕES** com regras e exemplos
- Zero mudanças no frontend ou banco de dados

