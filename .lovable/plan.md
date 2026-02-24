

## Humanizar a IA de vendas (WhatsApp + Admin)

### Problema
A IA atual vai direto ao assunto de vendas sem cumprimentar, sem perguntar como a pessoa esta. Isso faz parecer um robo. O ideal e que ela comece como um humano real: "opa, tudo bem?", "bom dia!", perguntar como a pessoa ta, e so depois ir pra conversa de vendas.

### O que muda

**Arquivos afetados:**
- `supabase/functions/whatsapp-webhook/index.ts` (SYSTEM_PROMPT)
- `supabase/functions/sales-chat/index.ts` (SYSTEM_PROMPT)

### Novo prompt (aplicado nos dois arquivos)

O SYSTEM_PROMPT sera reescrito para incluir:

1. **Regra de abertura humana**: Na primeira mensagem, SEMPRE cumprimentar antes de qualquer coisa. "Opa, tudo certo?", "E ai, como ta?", "Bom dia! Tudo bem por ai?". Nunca ir direto pro assunto.

2. **Regra anti-robo**: Se apresentar como pessoa real da equipe TrendFood. Nunca dizer que e IA ou assistente virtual. Falar como se fosse um colega mandando mensagem.

3. **Fluxo mais natural**:
   - Mensagem 1: Cumprimentar + perguntar como ta
   - Mensagem 2: Esperar resposta, responder de volta humanamente
   - Mensagem 3+: Ai sim perguntar sobre o negocio, qual a dor, etc.
   - So depois de entender a dor: conectar com a solucao

4. **Exemplos atualizados** com frases mais humanas tipo:
   - "Opa, tudo certo? Sou o pessoal aqui da TrendFood 😄"
   - "E ai, como ta o movimento ai no restaurante?"
   - "Que legal! Quanto tempo voces tao no ramo?"
   - "Poxa, imagino... taxa alta e fogo ne"

### Resultado
A IA vai parecer um vendedor humano real no WhatsApp, cumprimentando antes de vender, perguntando como a pessoa esta, e construindo rapport antes de falar do produto.

