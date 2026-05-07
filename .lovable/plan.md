## Sistema de Afiliados Externos — Comissão 50% Vitalícia + Liberação após 7 dias

### Resumo do que vai funcionar

- Cadastro **ilimitado** de afiliados no Admin (botão "+ Novo afiliado").
- Cada um recebe **link único**: `trendfood.lovable.app/cadastro?aff=joao123`.
- Cada afiliado pode trazer **quantas lojas quiser**.
- Toda vez que **qualquer loja dele paga** (1º mês, 2º, anuidade, sempre) → comissão 50% registrada e notificação Telegram individual.
- **Janela de reembolso de 7 dias**: comissão fica como `pendente` por 7 dias, depois libera automaticamente e dispara nova mensagem "💸 Dinheiro liberado".
- Painel ADM com histórico completo por loja: cadastro, cada pagamento, status (pendente/liberado/pago), totais.

### Fluxo das notificações Telegram (cada afiliado recebe SÓ as dele)

**Mensagem 1 — no momento do pagamento:**
```
💰 Novo pagamento do seu indicado!
🏪 Loja: Hamburgueria do Zé
📅 Cadastrou: 07/05/2026
💳 Pagou: R$ 49,90 (Pro Mensal)
🎯 Comissão (50%): R$ 24,95
⏳ Liberação em: 14/05/2026 (após 7 dias de reembolso)
📊 Suas lojas ativas: 7
```

**Mensagem 2 — 7 dias depois (automática):**
```
✅ Dinheiro liberado!
🏪 Loja: Hamburgueria do Zé
💵 Comissão liberada: R$ 24,95
💼 Total pendente de pagamento: R$ 173,40
```

Se o cliente solicitar reembolso/estornar dentro dos 7 dias → comissão marcada como `refunded`, manda mensagem:
```
⚠️ Reembolso processado
🏪 Loja: Hamburgueria do Zé
❌ Comissão de R$ 24,95 cancelada (cliente reembolsou em 3 dias)
```

### Banco de dados

**1. `affiliates`** — `id`, `name`, `telegram_chat_id`, `code` (único), `commission_pct` (default 50), `pix_key`, `phone`, `active`, `notes`, `created_at`. RLS só admin.

**2. `organizations.affiliate_id`** (coluna nova, FK opcional).

**3. `affiliate_commissions`**:
- `id`, `affiliate_id`, `organization_id`, `payment_id` (MP)
- `amount_paid_cents`, `commission_cents`, `commission_pct`, `billing_cycle`
- **`status`** enum: `pending` (dentro dos 7 dias) → `released` (liberado) → `paid` (admin pagou ao afiliado) | `refunded` (cliente estornou)
- `release_at` (timestamp = `created_at + 7 dias`)
- `released_at`, `paid_at`, `refunded_at`, `created_at`
- RLS só admin.

### Backend

**4. `mp-webhook/index.ts`** — após `payment.approved`:
- Se `org.affiliate_id` existe e ativo: insere linha em `affiliate_commissions` com `status='pending'`, `release_at = now() + 7 days`.
- Chama `notify-affiliate-telegram` (evento `new_payment`).
- Em `chargeback`/`refunded`: marca comissão como `refunded`, dispara evento `refunded`.

**5. Nova edge function `notify-affiliate-telegram`** (eventos: `new_payment`, `released`, `refunded`):
- Valida `telegram_chat_id` numérico antes do envio.
- Usa connector Telegram (`TELEGRAM_API_KEY` + `LOVABLE_API_KEY`).
- Falha não derruba webhook (try/catch + log).

**6. Nova edge function `release-affiliate-commissions`** (rodando via `pg_cron` a cada 1h):
- Busca todas `affiliate_commissions` com `status='pending'` e `release_at <= now()`.
- Atualiza para `status='released'`, `released_at=now()`.
- Dispara `notify-affiliate-telegram` evento `released` para cada uma (agrupando por afiliado para não spammar).

**7. `pg_cron` job** — `select cron.schedule('release-commissions-hourly', '0 * * * *', ...)` chamando a função acima.

### Frontend

**8. `AuthPage.tsx`** — captura `?aff=código`, valida affiliate ativo, salva em `organizations.affiliate_id`. Persiste em localStorage caso usuário navegue antes de cadastrar.

**9. `src/components/admin/AffiliatesTab.tsx`**:
- Lista afiliados com colunas: nome, código, telegram, lojas indicadas, **pendente** (R$), **liberado a pagar** (R$), **já pago** (R$).
- Botão "+ Novo afiliado" (sem limite).
- Botão "Editar".
- Botão "Copiar link".
- Botão **"Testar Telegram"** — manda mensagem teste antes de virar pra ele (economiza crédito).
- Modal "Ver detalhes": cada loja indicada com data de cadastro + tabela de pagamentos (data, valor, comissão, status colorido: amarelo/verde/azul/vermelho, data de liberação).
- Botão **"Marcar comissões como pagas"** (só libera quando `status='released'`, não permite pagar `pending`).

### Garantias contra os erros mencionados

| Risco | Mitigação |
|---|---|
| Telegram dar erro / gastar crédito | "Testar Telegram" antes de salvar; chat_id validado; falha logada sem derrubar webhook |
| Pagar comissão e cliente reembolsar | Janela de 7 dias antes de liberar; `chargeback` no webhook MP marca como `refunded` |
| Cron não rodar | `pg_cron` rodando de hora em hora; idempotente (só pega `pending` com `release_at <= now()`) |
| Afiliado spammar Telegram | Notificação de liberação agrupa por afiliado (1 msg com várias liberações se > 1 no mesmo ciclo) |
| Limite de afiliados | Sem limite — quantos quiser |
| Múltiplas lojas por afiliado | Modal mostra cada loja + histórico individual |
| Comissão errada com 50% off | Calculada sobre `amount_paid` real do MP |
| Outro afiliado ver comissão alheia | RLS só admin |

### Teste depois de pronto

1. Crio afiliado teste com seu próprio Telegram → "Testar Telegram" → você recebe ✅.
2. `?aff=teste` em aba anônima → cadastra loja fake → confirmo `affiliate_id` no banco.
3. Simulo `payment.approved` → recebe msg "Liberação em 7 dias".
4. Rodo `release-affiliate-commissions` manualmente (forçando data) → recebe msg "Dinheiro liberado".
5. Simulo `refunded` → recebe msg de cancelamento e status muda no painel.

Pode aplicar?
