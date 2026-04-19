
## Pedido
1. Texto pra divulgar nos grupos de donos sobre o aumento do limite no plano Free (20 → 30 itens)
2. Imagem pra acompanhar o texto

## Observação importante
O user falou "plano Pro" mas o aumento é no plano **Free** (20 → 30). Vou seguir o que foi implementado de fato (Free), e mencionar isso no texto de forma clara — se ele quis dizer outra coisa, ajustamos depois.

## Plano

### 1. Texto pro grupo (estilo WhatsApp/Telegram)
- Tom: animado, direto, próximo (como dono falando com dono)
- Estrutura: gancho → o que mudou → benefício prático → CTA
- Emojis pontuais (não é canvas-design — é comunicação real de grupo)
- ~80-120 palavras, formatado pra mobile
- Salvo em `/mnt/documents/anuncio-30-itens.txt`

### 2. Imagem (1080x1080, formato post de grupo)
- Modelo: `google/gemini-3-pro-image-preview` (qualidade alta, vale a pena pra peça de marketing)
- Conceito: card visual com "20 → 30 itens" em destaque, identidade TrendFood (cores premium do tema Live — tons escuros/glass, accent vibrante)
- Texto na imagem: mínimo ("+10 ITENS NO PLANO GRÁTIS" + logo TrendFood)
- Salvo em `/mnt/documents/anuncio-30-itens.png`
- QA: abro a imagem gerada, confirmo legibilidade do texto e que não tem artefato esquisito antes de entregar

### 3. Entrega
- Mostro o texto inline no chat (pra você copiar fácil)
- Anexo `<lov-artifact>` da imagem PNG
- Anexo `<lov-artifact>` do .txt também (caso queira baixar)

## Pergunta rápida antes de gerar

Confirma só uma coisa:

O aumento foi no **plano Grátis (Free)** — saiu de 20 pra 30 itens. Você escreveu "plano Pro" na mensagem. Tá certo o que foi implementado (Free) ou era pra ter mexido no Pro?

Assumindo que é **Free** (que é o que o código faz hoje), sigo com o texto/imagem nessa linha. Se for Pro, me avisa antes que eu reviso tudo.
