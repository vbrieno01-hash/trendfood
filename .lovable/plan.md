

## Automações Telegram — Resumos e Alertas de Abertura/Fechamento

### O que será implementado

Quatro automações automáticas via Telegram para lojas que configuraram o Chat ID:

1. **Resumo diário (23h)** — total de pedidos, faturamento, ticket médio, produto mais vendido
2. **Resumo semanal (domingo 23:05)** — mesmos dados + comparativo com semana anterior
3. **Aviso de abertura** — mensagem quando a loja abre conforme horário configurado
4. **Aviso de fechamento** — mensagem 10 min antes de fechar

### Arquitetura

```text
pg_cron (a cada minuto) → Edge Function "telegram-automations"
                           ├─ Verifica horário (Brasília)
                           ├─ 23:00 → gera resumo diário
                           ├─ dom 23:05 → gera resumo semanal
                           ├─ Horário de abertura → envia "Loja aberta"
                           └─ 10min antes fechar → envia "Loja fecha em breve"
```

### Etapas

**1. Migração SQL — tabela de controle**

Criar tabela `telegram_automations_log` para evitar envios duplicados:
- `id`, `organization_id`, `event_type` (daily/weekly/open/close), `sent_at`, `ref_date`
- Constraint unique em `(organization_id, event_type, ref_date)` para garantir idempotência
- RLS: apenas service_role acessa

**2. Edge Function `telegram-automations`**

Função chamada a cada minuto via pg_cron. Para cada organização com `telegram_chat_id` configurado:

- **Resumo diário (23:00 BRT)**: consulta pedidos do dia (`paid = true`), calcula total, faturamento, ticket médio, produto mais vendido. Envia mensagem formatada.
- **Resumo semanal (dom 23:05 BRT)**: mesma lógica mas para 7 dias, com comparativo dos 7 dias anteriores (ex: "📈 +15% vs semana passada").
- **Abertura**: lê `business_hours`, identifica o `from` do dia atual. Se horário atual = `from` (mesma hora e minuto), envia "🟢 Loja aberta!".
- **Fechamento**: se horário atual está a 10 min do `to`, envia "🔴 Loja fecha em 10 minutos".
- Antes de enviar, verifica na `telegram_automations_log` se já enviou para aquele org/evento/data.

**3. Agendar cron job**

Usar `pg_cron` + `pg_net` para chamar a edge function a cada minuto (via SQL insert, não migração).

**4. Atualizar TelegramTab**

Adicionar seção informativa mostrando as automações ativas:
- "Você receberá automaticamente: resumo diário às 23h, resumo semanal aos domingos, avisos de abertura e fechamento."

### Exemplo de mensagens

**Resumo diário:**
```
📊 Resumo do dia — 11/04/2026

🛒 Pedidos: 47
💰 Faturamento: R$ 3.240,00
🎫 Ticket médio: R$ 68,94
⭐ Mais vendido: X-Bacon (23 un.)
```

**Abertura:**
```
🟢 Sua loja está aberta! Boas vendas hoje.
```

**Pré-fechamento:**
```
🔴 Sua loja fecha em 10 minutos (às 23:00).
```

### Detalhes técnicos

- A edge function processa todas as orgs em batch (query única para orgs com `telegram_chat_id IS NOT NULL`)
- Horários calculados em BRT (GMT-3) consistente com `storeStatus.ts`
- A função roda em menos de 10s por execução (sem long polling)
- Nenhuma mudança no frontend além do texto informativo no TelegramTab

