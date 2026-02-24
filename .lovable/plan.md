

## Problema: IA ainda parece robo

A screenshot mostra a IA mandando "Boa noite link para fazer seu pedido" — isso é 100% robo. Nenhum humano manda assim. Um humano mandaria "opa boa noite, tudo bem?" e so depois, quando fizer sentido, mandaria um link.

### Causa raiz

A Regra 1 (NUNCA ENROLAR) ta forte demais e conflitando com a Regra 3 (ABERTURA). A IA ta interpretando que deve mandar link imediatamente em TODA primeira mensagem, mesmo quando ninguem pediu nada. Resultado: parece spam automatico.

### O que muda

**Arquivos afetados:**
- `supabase/functions/sales-chat/index.ts` (SYSTEM_PROMPT)
- `supabase/functions/whatsapp-webhook/index.ts` (SYSTEM_PROMPT)

### Mudancas no SYSTEM_PROMPT

1. **Reforcar a Regra 3 (ABERTURA) como prioridade na primeira mensagem**: A primeira mensagem NUNCA pode ter link, preco, produto ou mencao ao TrendFood. Tem que ser APENAS saudacao humana. Exemplos: "opa boa noite, tudo bem?" / "e ai, blz?" / "fala, como vai?"

2. **Clarificar a Regra 1**: A regra de "nunca enrolar" so se aplica quando o CLIENTE PEDIR algo. Se ninguem pediu link, NAO mande link. A IA so manda link/preco/info quando for SOLICITADO ou quando a conversa naturalmente chegar la (mensagem 6+).

3. **Adicionar regra anti-spam**: PROIBIDO mandar link na primeira mensagem. PROIBIDO mandar link sem o cliente ter perguntado. A IA precisa CONVERSAR primeiro como um ser humano normal.

4. **Reforcar exemplos do que NAO fazer**:
   - ERRADO: "Boa noite link para fazer seu pedido https://..."
   - ERRADO: "opa, da uma olhada aqui https://..."
   - CERTO: "opa boa noite, tudo bem?"
   - CERTO: "e ai, blz? como ta o movimento ai?"

5. **Fluxo humano reforçado**:
   - Mensagem 1: so saudacao ("opa boa noite, tudo bem?")
   - Mensagem 2-3: papo leve, perguntar como ta
   - Mensagem 4-5: perguntar sobre o negocio (delivery, pedidos)
   - Mensagem 6+: so AGORA pode mencionar TrendFood/link SE fizer sentido

### Resultado
A IA vai parecer uma pessoa real mandando mensagem no WhatsApp, nao um bot disparando link automatico.

