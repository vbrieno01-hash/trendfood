

## Plano — Atualizar mensagem de boas-vindas do Telegram

A mensagem que chega quando você clica em **"Testar"** ainda mostra a lista antiga (só 5 eventos). Vou modernizar pra refletir tudo que o sistema faz hoje.

### Como vai ficar a nova mensagem de teste

```text
✅ Telegram Admin conectado!

A partir de agora você recebe tudo da plataforma 
aqui em tempo real, organizado por categoria:

💰 FINANCEIRO
   • Pagamentos confirmados (com MRR)
   • Falhas de cobrança
   • Mudanças de assinatura

🚀 CRESCIMENTO
   • Novos cadastros
   • Indicações convertidas
   • Lojas quentes (leads pra abordar)

⏰ RETENÇÃO
   • Trials expirando (D-3 / D-1 / hoje)
   • Lojas frias (risco de churn)

⚠️ OPERACIONAL
   • Erros críticos
   • Pedidos fantasmas

📊 RELATÓRIOS AUTOMÁTICOS
   • Resumo diário às 09h
   • Resumo semanal aos domingos

💡 Dica: cada alerta de loja vem com botões 
de ação — toque em "💬 Falar com loja" e o 
WhatsApp abre com mensagem pronta!

Configure quais eventos receber em:
⚙️ Painel Admin → Telegram Admin
```

### Onde mexer

**Único arquivo editado:** `supabase/functions/admin-telegram-notify/index.ts`
- Atualizar o `case "test":` (linhas 146-156) com a nova lista categorizada
- Adicionar botão inline **"⚙️ Abrir Painel Admin"** na mensagem de teste

### O que NÃO vou mexer

- Lógica de envio (gateway, log, dedupe) — intacta
- Outras mensagens de eventos — já estão ok
- Triggers SQL, watchdog, mp-webhook — intactos
- UI da aba Telegram Admin — intacta

### Resultado

Quando você (ou qualquer admin futuro) clicar em "Testar", recebe uma mensagem bonita e categorizada que **explica tudo que o sistema faz**, em vez da lista enxuta antiga. Fica como um "cartão de boas-vindas" do sistema completo.

