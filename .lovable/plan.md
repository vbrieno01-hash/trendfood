

## Plano — Botões de WhatsApp com mensagem pronta no Telegram

Cada notificação que envolve uma loja vai chegar com **botões inline** clicáveis abaixo da mensagem. Você toca, abre o WhatsApp da loja com **mensagem pronta específica pro contexto**, é só apertar enviar.

### Como vai parecer no Telegram

```text
⏰ Trial expira em 1 dia
🏪 Pizzaria do João
📊 Já fez 47 pedidos no trial
📱 WhatsApp: 11 99999-9999
👉 Bom momento pra entrar em contato

┌────────────────────────────────────┐
│  💬 Falar com loja (mensagem pronta)│  ← link wa.me com texto
├────────────────────────────────────┤
│  🏪 Abrir vitrine                   │  ← link da loja
├────────────────────────────────────┤
│  ⚙️  Painel Admin                   │  ← gerenciar loja
└────────────────────────────────────┘
```

### Mensagens prontas por evento

Cada evento ganha um **template específico** em português, assinado como TrendFood, com tom apropriado:

**⏰ Trial expirando (D-3 / D-1 / hoje)**
> Olá, [Nome da Loja]! 👋 Aqui é o time da TrendFood. Notei que seu trial Pro acaba em [X dias] e você já fez [N] pedidos — ótimo ritmo! 🚀 Quer que eu te ajude a continuar com tudo liberado? Posso te mandar o link de pagamento ou tirar dúvidas sobre os planos. Me avisa por aqui!

**❌ Falha de cobrança**
> Olá, [Nome da Loja]! Aqui é a TrendFood. Sua cobrança da assinatura Pro foi recusada hoje ([motivo]). Pra não perder o acesso, é só atualizar o método de pagamento no painel: [link]. Qualquer dúvida, me chama por aqui que ajudo na hora!

**🔥 Lead quente (Free com volume alto)**
> Oi, [Nome da Loja]! Time da TrendFood aqui 🚀 Vi que vocês estão bombando hoje com [N] pedidos! No plano Free você tem várias limitações que podem estar te atrapalhando. Posso te mostrar como o Pro pode te dar pedidos ilimitados, cupons, fidelidade e muito mais. Topa um papo rápido?

**😴 Loja fria (risco churn)**
> Olá, [Nome da Loja]! Aqui é a TrendFood 👋 Notamos que vocês não receberam pedidos nos últimos dias. Tá tudo bem por aí? Se tiver alguma dificuldade com a plataforma, alguma dúvida ou precisar de ajuda pra divulgar a loja, me chama aqui — quero garantir que vocês tirem o máximo proveito do plano Pro!

**🆕 Novo cadastro**
> Olá, [Nome da Loja]! 👋 Boas-vindas à TrendFood! Sou do time e estou aqui pra te ajudar a configurar tudo certinho nos primeiros dias. Qualquer dúvida sobre cardápio, pagamentos, impressão ou WhatsApp, é só me chamar!

**💰 Pagamento confirmado**
> Olá, [Nome da Loja]! Aqui é a TrendFood 🎉 Seu pagamento foi confirmado e seu plano Pro está ativo. Obrigado pela confiança! Qualquer coisa que precisar, é só me chamar por aqui.

**📉 Cancelamento de assinatura**
> Olá, [Nome da Loja]! Aqui é a TrendFood. Vi que vocês cancelaram a assinatura — sentiremos falta! 😔 Se tiver 2 minutinhos, adoraria entender o que motivou e se tem algo que podemos melhorar. Estou à disposição!

**🤝 Indicação convertida** *(usa WhatsApp do indicador)*
> Olá, [Nome do Indicador]! 🎉 A loja [Nome do Indicado] que você indicou virou assinante Pro! Você acabou de ganhar +[X] dias Pro de bônus. Continue indicando! 🚀

### Como vai funcionar tecnicamente

**1. Editar `admin-telegram-notify`**
- Trocar `sendMessage` simples por `sendMessage` com `reply_markup.inline_keyboard`
- Nova função `buildButtons(eventType, payload)` que retorna array de botões com:
  - `text`: rótulo (ex: "💬 Falar com loja")
  - `url`: `https://wa.me/55XXXXXXXXXXX?text=...` (mensagem URL-encoded)
- Nova função `buildWhatsAppMessage(eventType, payload)` com os 8 templates acima
- Botões aparecem **só se a loja tiver WhatsApp cadastrado**
- Sempre incluir botão "🏪 Abrir vitrine" (link da loja) quando tiver `slug`
- Sempre incluir botão "⚙️ Painel Admin" linkando pra `https://trendfood.lovable.app/admin`

**2. Atualizar payloads do `admin-telegram-watchdog`**
- Já passa `whatsapp` em `trial_expiring` e `hot_lead` ✅
- Adicionar `slug` em todos os payloads (1 query a mais por sweep)
- Adicionar `whatsapp` no payload de `cold_store`

**3. Atualizar payloads dos triggers SQL**
- `trg_admin_notify_new_org` → já passa whatsapp e slug ✅
- `trg_admin_notify_subscription_change` → adicionar `whatsapp` e `slug`
- `trg_admin_notify_referral` → adicionar `whatsapp` do referrer

**4. Atualizar `mp-webhook` (payment_confirmed / payment_failed)**
- Adicionar `whatsapp` e `slug` da org no payload

### Sanitização do número de WhatsApp

Vou aplicar a mesma lógica que já é usada na plataforma:
- Remover tudo que não é dígito
- Garantir prefixo `55` (Brasil)
- Validar mínimo 12 dígitos antes de gerar o link
- Se inválido, simplesmente **não mostra o botão** (sem quebrar a mensagem)

### Telegram Inline Keyboard (formato técnico)

```json
{
  "reply_markup": {
    "inline_keyboard": [
      [{ "text": "💬 Falar com loja (msg pronta)", "url": "https://wa.me/5511999999999?text=..." }],
      [{ "text": "🏪 Abrir vitrine", "url": "https://trendfood.lovable.app/unidade/pizzaria-x" }],
      [{ "text": "⚙️ Painel Admin", "url": "https://trendfood.lovable.app/admin" }]
    ]
  }
}
```

Botões abrem **direto no WhatsApp** (web ou app, dependendo do dispositivo) com texto pré-preenchido. Você só precisa apertar enviar.

### O que NÃO vou mexer

- Sistema de Telegram dos lojistas — intocado
- Lógica de envio (gateway, log, dedupe) — intacta, só amplio o body do `sendMessage`
- Triggers de erro crítico (não tem loja específica) — sem botões de WhatsApp, só botão "Painel Admin → Logs"
- Resumos diários/semanais — sem botões (não é loja específica)

### Arquivos envolvidos

**Editados:**
- `supabase/functions/admin-telegram-notify/index.ts` (templates + inline keyboard)
- `supabase/functions/admin-telegram-watchdog/index.ts` (incluir slug nos payloads)
- `supabase/functions/mp-webhook/index.ts` (incluir whatsapp + slug nos payloads de payment)
- 1 migração SQL (atualizar 2 triggers pra incluir whatsapp/slug)

### Resultado esperado

Quando chegar uma notificação tipo "Trial expira em 1 dia", você toca no botão **"💬 Falar com loja"**, abre o WhatsApp do dono da loja com mensagem pronta personalizada, é só apertar **Enviar**. Nada de digitar, nada de copiar telefone, nada de pensar no que escrever.

