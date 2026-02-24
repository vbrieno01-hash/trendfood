

## Adicionar Regra 10 — Recuo Imediato quando o Lead Recusar

### Problema
Na imagem, o lead disse "nem me venha com proposta", depois "não preciso de nada", depois "EU NAO QUERO PROPOSTA. para de insistir" — e o Lucas continuou fazendo perguntas estratégicas de venda disfarçadas ("vc paga taxa?", "ele ja faz pix automatico?", "vc ja ta com o whatsmenu faz tempo?"). Isso é insistência e queima o lead.

A Regra 9 manda elogiar e fazer perguntas estratégicas, mas **não tem instrução de parar quando o lead pede**. A Regra 5 manda nunca encerrar, o que piora — o Lucas fica tentando manter o papo com perguntas de venda.

### Solução: Nova Regra 10

**REGRA NUMERO 10 - RECUO IMEDIATO:**

Quando o lead disser qualquer variação de "não quero proposta", "não preciso de nada", "para de insistir", "não tenho interesse", etc:

1. **Parar TODA tentativa de venda IMEDIATAMENTE.** Zero perguntas estratégicas, zero menção a taxas, PIX, concorrente, TrendFood.
2. **Respeitar com UMA frase curta:** "de boa, sem problema nenhum"
3. **Mudar 100% de assunto** — ir pra papo casual sobre o dia, o negócio dele, o movimento. Exemplo: "como ta o movimento hj?" / "sabado é corrido ai ne"
4. **Se o lead insistir na recusa pela SEGUNDA vez:** parar de tentar. Responder "tranquilo, to por aqui qualquer hora. boa noite!" e não mandar mais nada.
5. **PROIBIDO** fazer pergunta sobre o sistema atual do lead depois que ele recusou. "vc paga taxa nesse ai?" após um "não quero proposta" é INSISTÊNCIA.

### O que muda

**Arquivos afetados:**
- `supabase/functions/sales-chat/index.ts` (SYSTEM_PROMPT)
- `supabase/functions/whatsapp-webhook/index.ts` (SYSTEM_PROMPT)

### Mudanças no SYSTEM_PROMPT

1. Adicionar a **Regra 10** após a Regra 9 nos dois arquivos
2. Adicionar exemplos na seção de exemplos:
   - Lead: "nem me venha com proposta" → "de boa, sem problema. como ta o movimento ai?"
   - Lead: "não preciso de nada" → "tranquilo, to por aqui qualquer hora"
   - ERRADO: Lead diz "não quero proposta" e Lucas pergunta "vc paga taxa por pedido?" — isso é PROIBIDO
3. Atualizar a **Regra 5** para incluir exceção: se o lead recusar 2x, pode encerrar com despedida curta
4. Atualizar a **Regra 9** para incluir: se o lead já recusou proposta, NÃO seguir o fluxo de elogio/pergunta/dor

### Detalhes técnicos
- Mudança apenas nos SYSTEM_PROMPT dos dois edge functions
- Nenhuma mudança de banco de dados
- Deploy automático após edição

