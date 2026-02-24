

## Remover risadinhas excessivas da IA de vendas

### Problema
A IA ta usando "kkk" demais nas respostas, parecendo forçado. Vendedor profissional nao fica rindo a cada mensagem.

### O que muda

**Arquivos afetados:**
- `supabase/functions/sales-chat/index.ts` (SYSTEM_PROMPT)
- `supabase/functions/whatsapp-webhook/index.ts` (SYSTEM_PROMPT)

### Mudancas no SYSTEM_PROMPT

1. **Regra 7 (ESTILO)** — trocar a instrucao de risada:
   - DE: `Use "kkk" ou "kkkk" como risada (maximo 1 por mensagem)`
   - PARA: `EVITE risadas. No MAXIMO 1 "kkk" a cada 10 mensagens, e so quando fizer sentido real (tipo o cliente fez uma piada). Vendedor profissional nao fica rindo atoa.`
   - Remover a linha `Nunca use "haha", "rsrs", "hehe". So kkk.` — simplificar pra `NUNCA use risadas tipo haha, rsrs, hehe, kkk exceto raramente.`

2. **Regra 6 (ANTI-ROBO)** — remover o "kkk" do exemplo:
   - DE: `"kkk relaxa, sou o Lucas do TrendFood"`
   - PARA: `"relaxa, sou o Lucas do TrendFood"`

3. **Exemplos** — remover "kkk" dos exemplos errados onde aparece como padrao de comportamento.

### Resultado
A IA vai responder de forma profissional sem ficar rindo a cada mensagem. Risada so quando o contexto realmente pedir.

