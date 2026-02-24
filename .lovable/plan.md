

## Bot WhatsApp automático (mesmo padrão da impressora)

A ideia é replicar a arquitetura que já funciona na impressora térmica: uma edge function de fila + um agente local que faz polling.

### Arquitetura

```text
WhatsApp Web (Evolution API local)
        |
        v
  Edge Function: whatsapp-webhook
  (recebe mensagem, salva na fila)
        |
        v
  Tabela: fila_whatsapp
  (mensagens pendentes de resposta)
        |
        v
  Edge Function: whatsapp-queue
  (polling igual printer-queue, gera resposta com IA, retorna)
        |
        v
  Evolution API local envia resposta no WhatsApp
```

### O que eu consigo fazer aqui (backend)

1. **Tabela `fila_whatsapp`** com colunas: id, phone, incoming_message, ai_response, status (pendente/respondido), created_at
2. **Edge function `whatsapp-webhook`** -- recebe mensagens da Evolution API, salva na fila, gera resposta usando o mesmo prompt do sales-chat, e retorna
3. **Edge function `whatsapp-queue`** -- endpoint de polling (igual `printer-queue`) para um agente local consultar mensagens pendentes e marcar como respondidas

### O que você precisa fazer no seu PC (parte local)

Instalar a **Evolution API** (open source, grátis) no seu computador. Ela simula o WhatsApp Web e permite enviar/receber mensagens por API local.

- Roda com Docker: `docker run` e pronto
- Escaneia QR code do seu WhatsApp uma vez
- Configura o webhook apontando pra nossa edge function
- Funciona 24h enquanto o PC estiver ligado

A Evolution API faz o papel do "exe" -- é um programa que roda local no seu PC, conecta no seu WhatsApp, e chama nossa edge function automaticamente quando chega mensagem.

### Resumo

| Parte | Onde roda | Quem faz |
|-------|-----------|----------|
| Receber/enviar WhatsApp | Seu PC (Evolution API) | Você instala |
| Fila de mensagens | Nuvem (banco de dados) | Eu crio |
| IA que gera respostas | Nuvem (edge function) | Eu crio |
| Orquestração | Evolution API webhook | Automático |

### Resultado final

Mensagem chega no seu WhatsApp -> Evolution API envia pra nuvem -> IA gera resposta -> Evolution API envia de volta automaticamente. Tudo sem pagar API, sem taxa, open source.

