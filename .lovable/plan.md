

## Ajustar tom do assistente de vendas: mais curto e humano

O problema esta no system prompt da edge function. As regras atuais pedem "maximo 3-4 paragrafos", mas na pratica a IA ainda gera textos longos e com cara de robo. Vamos reforcar drasticamente as instrucoes de brevidade e naturalidade.

### O que muda

1. **System prompt reescrito** no arquivo `supabase/functions/sales-chat/index.ts`
   - Limite de resposta: maximo 2-3 frases curtas por mensagem (estilo WhatsApp real)
   - Proibir paragrafos longos, listas com bullets e formatacao excessiva
   - Reforcar: falar como uma pessoa de verdade digitando no celular
   - Adicionar exemplos concretos de como responder (few-shot)
   - Instrucao explicita: "Nunca mande textao. Se precisar explicar algo maior, quebre em varias mensagens curtas ao longo da conversa."

### Detalhes tecnicos

**Alteracoes no system prompt (edge function `sales-chat`):**

Regras novas que substituem as atuais:
- Respostas de 1 a 3 frases no maximo. Como se fosse uma mensagem de WhatsApp.
- NUNCA use listas com bullets, numeracao ou formatacao markdown.
- NUNCA mande blocos grandes de texto. Menos é mais.
- Fale como uma pessoa real: abreviacoes ok, pontuacao leve, sem formalidade.
- Se o cliente perguntar algo complexo, responda o essencial e pergunte se quer saber mais.
- Exemplos de tom: "Show! Me conta, qual tipo de comida voces trabalham?" / "Entendi demais. Isso de taxa alta do iFood doi no bolso ne" / "Bora testar 7 dias gratis? Sem pedir cartao nem nada"

Tambem adicionar `temperature: 0.9` na chamada da API para respostas mais naturais e variadas.

Nenhuma outra alteracao necessaria -- apenas o prompt e o parametro de temperatura.
