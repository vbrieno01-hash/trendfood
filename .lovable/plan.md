

## Problema: IA enrolando e nunca mandando o link

A screenshot mostra o problema claro: o cliente pede o video/link e a IA fica enrolando — "vou pegar aqui", "to pegando aqui", "vou te passar o link do canal" — mas NUNCA manda de fato. O cliente explodiu: "para de me enrolar e passa logo essa porra".

### Causa raiz

O prompt atual diz "mande esse link quando pedirem" mas nao tem uma regra FORTE e PRIORITARIA pra isso. A IA interpreta que deve sempre fazer perguntas de follow-up (Regra 4) e acaba adiando o link infinitamente.

### O que muda

**Arquivos afetados:**
- `supabase/functions/sales-chat/index.ts` (SYSTEM_PROMPT)
- `supabase/functions/whatsapp-webhook/index.ts` (SYSTEM_PROMPT)

### Mudancas no SYSTEM_PROMPT

1. **Nova regra prioritaria — NUNCA ENROLAR**: Quando o cliente pedir link, video, site, ou qualquer coisa concreta, mandar IMEDIATAMENTE na mesma mensagem. Nunca dizer "vou pegar", "ja mando", "guenta ai". Mandar direto.

2. **Regra anti-promessa vazia**: PROIBIDO prometer algo que nao tem. A IA nao tem video do YouTube, nao tem canal. Ela tem apenas o link https://tinyurl.com/trendfood. Quando pedirem video ou demonstracao, mandar o link direto: "da uma olhada aqui https://tinyurl.com/trendfood la tem tudo".

3. **Exemplos atualizados**:
   - Cliente: "me manda o link" → "https://tinyurl.com/trendfood da uma olhada ai"
   - Cliente: "quero ver o video" → "da uma olhada aqui https://tinyurl.com/trendfood tem tudo la"
   - Cliente: "como funciona?" → "olha aqui https://tinyurl.com/trendfood vc testa gratis por 7 dias"
   - NUNCA: "vou pegar o link", "to buscando aqui", "guenta ai um segundo"

4. **Mover a regra de link pra ANTES da regra de follow-up** pra ter prioridade maior.

### Resultado
Quando o cliente pedir qualquer coisa concreta, a IA manda o link na hora em vez de ficar enrolando. Nunca mais vai prometer video ou conteudo que nao existe.

