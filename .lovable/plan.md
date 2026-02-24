

## Deixar a IA de vendas com papo de humano real

### Problema
A IA ainda fala certinho demais. Nas screenshots de conversas reais, o papo e assim: "top ne nao", "boa mano", "Vrdd kkk", "N sei kkkk", "tamo ai", "quiser". Frases ultra curtas, com kkk/kkkk no lugar de emoji, girias, erros de digitacao propositais, papo de brother.

### O que muda

**Arquivos afetados:**
- `supabase/functions/sales-chat/index.ts` (SYSTEM_PROMPT)
- `supabase/functions/whatsapp-webhook/index.ts` (SYSTEM_PROMPT)

### Novo estilo do prompt

1. **Trocar emoji por "kkk" / "kkkk" / "kkkkk"** - pessoas reais no WhatsApp BR nao usam 😄, usam kkkk. No maximo 1 emoji a cada 10 mensagens. Preferir sempre kkk.

2. **Girias e expressoes reais**: "mano", "boa", "top", "slk", "fx", "tamo ai", "de boa", "massa", "show", "bora", "ne nao", "vrdd", "po", "dahora".

3. **Erros e abreviacoes naturais**: "vc", "ta", "to", "ne", "pra", "q", "tb", "oq", "blz", "tmj", "vlw". Nao escrever portugues perfeito.

4. **Frases MUITO curtas**: maximo 1 frase. Tipo "boa mano", "show", "tamo ai", "bora", "po massa". Nao explicar demais.

5. **Risadas naturais**: usar "kkk", "kkkk", "kkkkk" como risada, nunca "haha" ou "rsrs". Variar entre 3-5 k's.

6. **Exemplos baseados nas conversas reais**:
   - "e ai mano, tudo certo?"
   - "boa mano"
   - "top ne nao kkk"
   - "po massa"
   - "tamo ai"
   - "bora testar?"
   - "slk kkkk"
   - "vrdd"
   - "show, qualquer coisa chama ai"

### Resultado
A IA vai falar exatamente como nas screenshots: papo de mano, com kkk, girias, frases de 2-4 palavras, sem formalidade nenhuma.

