## Diagnóstico (bug confirmado no banco)

Encontrei a causa exata olhando `activation_logs`:

```
Teste loja | old_plan: enterprise | new_plan: addon:campaign_250 | source: mercadopago_pix_reconcile
```

Fluxo do bug:
1. Lojista compra o addon "Campanhas WhatsApp" (250 créditos).
2. `create-campaign-pix` insere corretamente na `pending_subscription_payments` com `plan = 'addon:campaign_250'`.
3. Quando o pagamento aprova, o `mp-webhook` até tem short-circuit correto para addon — MAS o **`reconcile-pending-pix`** (chamado pelo `watchdog-pix-stuck` e pelo polling do frontend) NÃO tem esse tratamento.
4. Ele executa `activateOrg` cegamente: `UPDATE organizations SET subscription_plan = 'addon:campaign_250', subscription_status='active', trial_ends_at=+30d`.
5. Resultado: o `subscription_plan` da loja vira uma string inválida (`addon:campaign_250`). `usePlanLimits` não reconhece → bloqueia features Pro/Enterprise → parece que o lojista "perdeu acesso" ao recarregar. Bônus ruim: os 250 créditos nunca são adicionados na `campaign_credits` (RPC `apply_campaign_credits_purchase` nunca roda).

Estado atual verificado: org `Teste loja` está com `subscription_plan = addon:campaign_250` e zero linhas em `campaign_credits`.

## O que vou fazer

### 1. Corrigir `supabase/functions/reconcile-pending-pix/index.ts`
Antes do fluxo padrão em `activateOrg`, adicionar guarda:
- Se `pending.plan` começar com `"addon:"` → NÃO tocar em `subscription_plan`, `subscription_status`, `trial_ends_at` nem `billing_cycle`.
- Se addon for `campaign_250` → chamar `supabase.rpc("apply_campaign_credits_purchase", { _org_id, _credits: 250, _days: 30, _payment_id })`.
- Marcar `pending_subscription_payments.status = 'approved'` normalmente.
- Registrar `activation_logs` com `old_plan/new_plan = null` e nota "Addon creditado via reconciliação".
- Addon desconhecido → apenas logar e marcar como aprovado, sem mexer no plano.

Isso também protege o `watchdog-pix-stuck`, que só delega para o `reconcile`.

### 2. Migration de reparo: consertar `Teste loja` e liberar acesso agora
- `UPDATE organizations SET subscription_plan='enterprise' WHERE id='644ea910-26bf-486e-9504-5a71fc2bd128'` (era enterprise antes do bug, `trial_ends_at` já está OK).
- `SELECT apply_campaign_credits_purchase('644ea910-26bf-486e-9504-5a71fc2bd128'::uuid, 250, 30, NULL)` para creditar o que o lojista pagou.
- Inserir `activation_logs` documentando o rollback manual.

### 3. Validação
- Ler `organizations` pós-migration para confirmar plano `enterprise` e créditos na `campaign_credits`.
- Confirmar que o novo `reconcile` compila (typecheck automático da plataforma).

## Escopo NÃO incluído
- Não vou reescrever o `mp-webhook` (ele já trata addon corretamente).
- Não vou mexer no `create-campaign-pix`, `check-campaign-pix`, nem no frontend.
- Não vou mexer em fluxos de assinatura Pro/Enterprise reais.

## Impacto
- Um arquivo de edge function alterado (`reconcile-pending-pix/index.ts`).
- Uma migration SQL curta de correção pontual.
- Zero risco para pagamentos de plano (Pro/Enterprise) — o caminho normal continua idêntico; só adiciono um early-return para linhas de addon.
