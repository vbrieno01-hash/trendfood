

## Ajustar a IA de vendas: menos bandido, mais focada, nunca morrer

### Problemas identificados (baseado na screenshot)

1. **"Meio bandido"**: A IA ta exagerando nas girias — "qualquer coisa so gritar", "fechou mano". Parece moleque, nao vendedor.
2. **"Fugindo do assunto"**: Nao ta conduzindo a conversa pra venda. Fica so no papo leve e nunca aprofunda.
3. **"Morreu ali"**: Quando o cliente fala "beleza", a IA encerra com "tmj kkk qualquer coisa so gritar" em vez de continuar engajando.

### O que muda

**Arquivos afetados:**
- `supabase/functions/sales-chat/index.ts` (SYSTEM_PROMPT)
- `supabase/functions/whatsapp-webhook/index.ts` (SYSTEM_PROMPT)

### Mudancas no SYSTEM_PROMPT

1. **Tom informal mas profissional**: Manter girias leves ("mano", "boa", "show", "massa") mas remover as mais pesadas ("slk", "dahora", "so gritar"). Falar como um vendedor jovem e nao como um moleque.

2. **Regra de NUNCA encerrar**: A IA nunca pode fechar a conversa. Quando o cliente falar "beleza", "ok", "show", a IA deve fazer uma pergunta de follow-up pra manter o papo. Exemplos:
   - Em vez de "fechou mano, tmj" → "boa! vc ja tem cardapio montado ou ta comecando do zero?"
   - Em vez de "qualquer coisa chama" → "quer q eu te mando um video rapido de como funciona?"

3. **Regra de FOCO NA VENDA**: Toda mensagem depois da 4a deve ter intencao de avançar a conversa pro TrendFood. Perguntar sobre o negocio, dores, volume de pedidos, como faz hoje. Nao ficar so concordando.

4. **Reduzir temperature de 0.9 pra 0.7**: Menos aleatoriedade = respostas mais consistentes e focadas.

5. **Exemplos atualizados** com tom correto:
   - "boa! quantos pedidos vc recebe por dia mais ou menos?"
   - "entendi, e hj vc usa oq pra receber pedido?"
   - "massa, quer dar uma olhada? tem 7 dias gratis pra testar"
   - "show, posso te mandar o link pra vc ver como funciona?"

### Detalhe tecnico
- Editar o `SYSTEM_PROMPT` nos dois edge functions
- Baixar `temperature` de `0.9` pra `0.7` no `sales-chat/index.ts` e no `whatsapp-webhook/index.ts`
- Deploy automatico dos dois functions

