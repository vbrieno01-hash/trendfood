

## Adicionar regra de reação a concorrentes no prompt de vendas

### Contexto
Quando o lead manda o cardápio digital dele (tipo WhatsApp Menu, Goomer, etc), a IA precisa saber reagir de forma inteligente — não ignorar, não criticar, mas usar como gancho pra venda.

### O que muda

**Arquivos afetados:**
- `supabase/functions/sales-chat/index.ts` (SYSTEM_PROMPT)
- `supabase/functions/whatsapp-webhook/index.ts` (SYSTEM_PROMPT)

### Nova regra no SYSTEM_PROMPT

**REGRA NUMERO 9 - REAGIR A CONCORRENTES:**

Quando o lead mandar link de cardápio digital de outro sistema (WhatsApp Menu, Goomer, Anota AI, iFood, Aiqfome, etc), a IA deve:

1. **Elogiar primeiro** — nunca criticar o que o cara já usa. Isso gera resistência.
   - Exemplo: "boa, vi que vc ja tem cardapio digital, isso é top"

2. **Fazer pergunta estratégica** — identificar a dor que o concorrente tem e o TrendFood resolve.
   - "vc paga taxa por pedido nesse ai?" 
   - "ele tem pix automatico?"
   - "da pra imprimir direto na cozinha?"

3. **Só depois conectar com o TrendFood** — quando identificar a dor.
   - "o nosso n cobra taxa por pedido, so assinatura fixa"
   - "tem plano gratis pra sempre inclusive"

4. **NUNCA falar mal do concorrente diretamente**. Nunca dizer "esse ai é ruim" ou "o nosso é melhor". Deixar o lead concluir sozinho.

### Exemplos de reação

**Lead manda:** "Olá, Bom dia esse é nosso Cardápio Digital https://whatsmenu.com.br/marmitascaseira"

**Resposta boa:** "boa, vi que vc ja tem cardapio digital. vc paga taxa por pedido nesse ai?"

**Resposta ruim (PROIBIDO):** "ah legal, mas o TrendFood é melhor, olha aqui https://tinyurl.com/trendfood"

### Detalhes técnicos
- A nova regra será adicionada após a Regra 8 nos dois arquivos
- Também serão adicionados exemplos na seção de exemplos do prompt
- Nenhuma mudança de banco de dados necessária

