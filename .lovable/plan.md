
# Robô do WhatsApp — o que ele vai fazer

Hoje o seu "robô" só dispara mensagem manual quando você clica em "aceitar pedido". A ideia é transformar ele num **vendedor automático que trabalha 24h** — recupera quem ia comprar e não comprou, atende sozinho, e avisa o cliente em cada etapa sem você apertar nada.

Vou dividir em 4 módulos. Você aprova e a gente implementa por etapa (não dá pra fazer tudo num só plano sem virar bagunça).

---

## Módulo 1 — Carrinho abandonado (recuperação de venda)

**O problema hoje:** Cliente entra no seu cardápio, escolhe 3 itens, vai pra tela de checkout… e some. Você nem sabe que perdeu essa venda. Em média **70% dos carrinhos somem** em delivery.

**Como o robô vai resolver:**
1. Quando o cliente coloca o telefone no checkout (mas não finaliza), a gente salva o "carrinho fantasma" no banco com nome, telefone, itens e total.
2. Depois de **15 minutos sem finalizar**, o robô manda automaticamente:
   > "Oi [Nome]! Vi que você montou um pedido de R$ 47,90 (1 X-Burger + Coca) mas não finalizou. Tá com alguma dúvida? Se quiser, é só clicar pra retomar: [link com carrinho pronto]"
3. Se não responder em 2h, manda uma segunda com **cupom de 10% OFF** pra fechar.
4. Painel mostra: "Você recuperou R$ X esse mês com carrinho abandonado".

**Resultado típico:** recupera 15-25% dos carrinhos perdidos = vendas extras sem custo.

---

## Módulo 2 — Reativação de cliente sumido

**O problema hoje:** Cliente comprou uma vez, gostou, mas esqueceu de você. Sem lembrete, vai pro concorrente.

**Como o robô vai resolver:**
1. A cada noite, o sistema varre quem **comprou há 30 dias e não voltou**.
2. Robô manda automaticamente:
   > "Oi [Nome]! Faz um tempinho que você não pede aqui 😋 Tá com saudade do nosso [item mais pedido por ele]? Hoje tem cupom VOLTEI com 15% OFF. Bom apetite!"
3. Você define no painel: prazo (15/30/60 dias), valor do cupom, e quais clientes incluir (ex: só quem gastou +R$50).
4. Painel mostra: "X clientes reativados esse mês = R$ Y de venda recuperada".

---

## Módulo 3 — Pedido pelo próprio WhatsApp (com IA)

**O problema hoje:** Muito cliente velhinho ou com preguiça não quer abrir cardápio digital. Ele só manda "quero 2 X-Tudo e uma Coca 2L".

**Como o robô vai resolver:**
1. Cliente manda mensagem livre no WhatsApp da loja.
2. IA (Lovable AI, sem custo extra de API) entende o pedido, consulta seu cardápio em tempo real e responde:
   > "Confirmando: 2x X-Tudo (R$ 28 cada) + 1x Coca 2L (R$ 14) = R$ 70. Endereço de entrega? Forma de pagamento (PIX/Cartão/Dinheiro)?"
3. Cliente confirma, robô **cria o pedido no seu KDS automaticamente** — aparece pra cozinha igualzinho a um pedido normal.
4. Se a IA não entender (ex: item que não existe, fora da área de entrega), ela escala pra você atender manual.

**Importante:** Isso não substitui o cardápio digital — é um **canal a mais** pra quem prefere zap.

---

## Módulo 4 — Status automático de cada pedido

**O problema hoje:** Você precisa lembrar de avisar cliente em cada etapa, ou ele fica ansioso e te enche.

**Como o robô vai resolver — sem você apertar nada:**
- Pedido recebido → "Recebemos seu pedido #123! Em instantes confirmamos."
- Loja aceita → "Seu pedido foi aceito! Tempo estimado: 35 min."
- PIX confirmado → "Pagamento confirmado ✅ já tá na fila da cozinha."
- Saiu pra entrega → "Seu entregador [Nome] saiu! Chega em ~15 min."
- Entregue → "Pedido entregue! Avalia a gente? ⭐ [link]"

Tudo disparado por **gatilhos no banco** (quando o status do pedido muda, o robô reage sozinho).

---

## Sobre "qual API do zap usar"

Você falou que tá perdido nessa parte. **Resposta direta:** vamos usar a **Evolution API** (que já roda no seu servidor Oracle, conforme já está configurado na arquitetura do projeto). Não precisa contratar nada novo, não tem custo por mensagem, e suporta TUDO acima.

Quando chegar na hora de plugar, eu te peço **só 2 coisas** (já te explico onde achar cada uma):
1. URL da sua instância Evolution (algo tipo `https://seu-servidor.com`)
2. Token de API (gerado dentro do painel da Evolution)

Sem precisar você escolher nada técnico.

---

## Ordem sugerida de implementação

```text
Etapa 1 (1ª entrega)  →  Módulo 4: Status automático
                          (mais fácil, valor imediato, valida o robô)

Etapa 2 (2ª entrega)  →  Módulo 1: Carrinho abandonado
                          (maior ROI, recupera dinheiro perdido)

Etapa 3 (3ª entrega)  →  Módulo 2: Reativação 30 dias
                          (cron diário, simples)

Etapa 4 (4ª entrega)  →  Módulo 3: Pedido por WhatsApp com IA
                          (mais complexo, depois que o resto estiver sólido)
```

---

## Detalhes técnicos (resumo)

- Carrinho abandonado: nova tabela `abandoned_carts` (telefone, itens JSONB, total, created_at, recovered_at), trigger no checkout salva, `pg_cron` a cada 5 min varre carrinhos > 15 min sem `recovered_at` e enfileira mensagem.
- Reativação: `pg_cron` diário à noite (ex: 19h) + query nos `orders` por telefone com último pedido > 30 dias.
- Pedido por IA: nova edge function `whatsapp-ai-order` que recebe mensagem da Evolution (webhook), chama Lovable AI Gateway com cardápio da loja como contexto, e cria pedido via RPC.
- Status automático: trigger AFTER UPDATE em `orders` que enfileira mensagem WhatsApp por `status`.
- Tudo usa a infraestrutura já existente: tabela `fila_whatsapp`, edge function `whatsapp-queue`, Evolution API no Oracle.
- Configuração no painel: nova aba "Robô WhatsApp" em Configurações com toggles por módulo, prazos, textos editáveis e cupons.

---

**Me responde qual módulo você quer começar** (sugiro o 4 — Status automático, pra você sentir o robô funcionando) **ou se quer fazer todos de uma vez**. Depois disso eu monto o plano detalhado e técnico só desse módulo pra implementar.
