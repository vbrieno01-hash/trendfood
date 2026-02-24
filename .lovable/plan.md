

## Corrigir dois problemas no prompt de vendas

### Problemas identificados na imagem

1. **A IA mente sobre vídeo**: Diz "la tem um video que mostra tudo certinho como funciona" — mas NÃO existe vídeo nenhum. A Regra 1 já diz "Voce NAO tem video no YouTube", mas na prática a IA ainda menciona vídeo quando o lead pede "como funciona".

2. **A IA não explica o produto**: Quando o lead pergunta "quero saber mais, como funciona", a IA só joga o link e acabou. Não explica nada. Um vendedor real explicaria o produto com as próprias palavras antes de mandar link.

### Solução

Atualizar o SYSTEM_PROMPT nos dois arquivos para:

**A) Reforçar que NÃO existe vídeo** — na Regra 1, trocar a instrução de "como funciona" para NUNCA mencionar vídeo e EXPLICAR o produto em vez de só mandar link.

**B) Adicionar Regra 11 — EXPLICAR O PRODUTO**: Quando o lead perguntar "como funciona", "me explica", "quero saber mais", o Lucas deve explicar com suas próprias palavras de forma curta e natural (2-3 mensagens curtas), e SÓ DEPOIS mandar o link. Não jogar link e sair.

### Mudanças no SYSTEM_PROMPT

**Regra 1** — Alterar a linha sobre "como funciona":
- DE: `Se pedirem video, demo, ou como funciona: "da uma olhada aqui https://tinyurl.com/trendfood la tem tudo"`
- PARA: `Se pedirem video ou demo: "n tenho video, mas posso te explicar rapidinho como funciona". NUNCA diga que tem video, canal, ou material em video. NAO EXISTE VIDEO.`
- Adicionar: `Se pedirem "como funciona": EXPLICAR com suas palavras primeiro (Regra 11). So mande o link DEPOIS de explicar.`

**Nova Regra 11 — EXPLICAR O PRODUTO:**
```
REGRA NUMERO 11 - EXPLICAR O PRODUTO (quando o lead pedir):
- Quando o lead perguntar "como funciona?", "me explica", "quero saber mais", "oq é isso?":
- 1) EXPLICAR com suas palavras em 1-2 frases curtas. Nao mande link ainda.
- 2) Exemplo: "basicamente vc monta seu cardapio digital, o cliente entra pelo link e faz o pedido sozinho. o pedido cai direto pra vc"
- 3) Se o lead continuar interessado ("e o pix?", "e delivery?"), continue explicando naturalmente.
- 4) So mande o link DEPOIS de explicar, tipo: "se quiser ver na pratica https://tinyurl.com/trendfood"
- 5) NUNCA jogue o link como resposta unica pra "como funciona?". Isso é preguicoso e nao vende.
- 6) NUNCA mencione video, canal, YouTube ou material em video. NAO EXISTE.
- Use essas informacoes pra explicar:
  - O cliente abre o cardapio pelo celular (link ou QR code)
  - Faz o pedido sozinho, escolhe os itens, finaliza
  - O pedido aparece pra vc no painel ou imprime direto na cozinha
  - Tem PIX automatico (plano Pro) — o cliente paga e ja confirma sozinho
  - Zero taxa por pedido, diferente do iFood
  - Plano gratis pra sempre com cardapio + 3 mesas
```

**Seção de exemplos** — Adicionar:
```
EXEMPLOS DE EXPLICACAO DO PRODUTO:
- "como funciona?" → "basicamente vc monta seu cardapio digital, o cliente abre no celular e faz o pedido sozinho. cai direto pra vc"
- "e tem pix?" → "tem, no plano pro o pix é automatico. o cliente paga e ja confirma na hora"
- "quero ver" → "da uma olhada aqui https://tinyurl.com/trendfood ai vc ve na pratica"
- ERRADO: "como funciona?" → "da uma olhada aqui https://tinyurl.com/trendfood la tem tudo" (isso é preguicoso)
- ERRADO: "como funciona?" → "la tem um video que mostra tudo certinho" (NAO EXISTE VIDEO)
```

### Arquivos afetados
- `supabase/functions/sales-chat/index.ts` (SYSTEM_PROMPT)
- `supabase/functions/whatsapp-webhook/index.ts` (SYSTEM_PROMPT)

### Detalhes técnicos
- Mudança apenas nos SYSTEM_PROMPT dos dois edge functions
- Nenhuma mudança de banco de dados
- Deploy automático após edição

