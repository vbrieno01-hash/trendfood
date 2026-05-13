## Diagnóstico

Investiguei a fila completa do PIX de assinatura. O fluxo atual depende **100% do navegador do cliente ficar aberto na tela do QR Code**:

1. `create-mp-payment` cria o PIX no Mercado Pago e devolve o `payment_id`.
2. O componente `PixPaymentTab.tsx` faz polling a cada 5s chamando `check-subscription-pix`, que consulta a API do MP. Se aprovou → ativa o plano.
3. **Existe** o webhook `mp-webhook` que ativaria o plano automaticamente quando o MP avisa do pagamento — porém, ao consultar os logs, **há ZERO chamadas para `mp-webhook` em todo o histórico recente**. Só o `ifood-webhook` aparece. Ou seja: o MP **nunca** notifica nossa plataforma.

Resultado prático:
- Cliente que **espera o QR aparecer aprovado** na tela → ativa (foi o caso da WrBurg e da lanchonetedopastor — os dois últimos PIX, ambos com source `mercadopago_pix` = polling do front).
- Cliente que **paga e fecha o navegador** antes do polling detectar → **nunca ativa**. Foi exatamente o que aconteceu com o estabelecimento que você visitou.

A causa-raiz é que a URL de webhook `https://xrzudhylpphnzousilye.supabase.co/functions/v1/mp-webhook` **não está cadastrada no painel do Mercado Pago** da conta CNPJ. Sem cadastrar lá, o MP não tem como nos avisar.

## Plano de correção (em camadas, redundante de propósito)

### 1. Persistir pagamentos PIX pendentes
Hoje, quando `create-mp-payment` cria um PIX, o `payment_id` só vive na memória da aba do navegador. Vou criar a tabela `pending_subscription_payments`:
- `org_id`, `plan`, `billing_cycle`, `promo_applied`, `payment_id`, `amount_cents`, `status` (`pending`/`approved`/`expired`/`failed`), `created_at`, `expires_at`.
- `create-mp-payment` insere uma linha sempre que devolve um QR PIX.
- `check-subscription-pix` e o webhook marcam como `approved` ao confirmar.

### 2. Cron de reconciliação (rede de segurança)
Edge function nova `reconcile-pending-pix` que roda a cada 1 minuto via `pg_cron` + `pg_net`:
- Pega todas as linhas `pending` com menos de 35 min de vida (PIX MP expira em 30 min).
- Para cada uma, consulta `https://api.mercadopago.com/v1/payments/{payment_id}`.
- Se aprovado → ativa o plano (mesma lógica de `check-subscription-pix`), grava `activation_logs` com source `mercadopago_pix_reconcile`, marca a linha como `approved`.
- Se expirado/rejeitado → marca como `expired`/`failed`.

Assim, mesmo que o cliente feche o navegador imediatamente após pagar, em até 1 minuto o plano ativa sozinho.

### 3. Botão "Já paguei, verificar agora" no dashboard
Em `SubscriptionTab.tsx`, se houver um `pending_subscription_payments` ativo da org, mostrar um aviso amarelo: "Pagamento PIX em verificação" com botão **Verificar agora** que dispara `reconcile-pending-pix` para aquele `payment_id` específico. Resolve o caso de o cliente entrar em pânico e clicar.

### 4. Configurar a URL do webhook no Mercado Pago (ação manual sua)
Eu vou deixar o `mp-webhook` pronto (já está). Você precisa entrar no painel da sua conta MP CNPJ → **Suas integrações → Webhooks** → cadastrar:
```
https://xrzudhylpphnzousilye.supabase.co/functions/v1/mp-webhook
```
Eventos: `payment` e `subscription_preapproval`. Vou te lembrar disso ao finalizar a implementação. Mesmo sem isso o cron resolve, mas o webhook deixa a ativação **instantânea** em vez de até 60s.

### 5. Notificação Telegram quando reconciliação ativar
Quando o cron ativar um plano que estava parado, dispara `admin-telegram-notify` com evento `payment_confirmed_reconcile` para você ver que a rede de segurança pegou um caso.

## Detalhes técnicos

**Migration:**
- Cria `pending_subscription_payments` com RLS (admin + dono da org SELECT; INSERT/UPDATE só service_role).
- Habilita `pg_cron` e `pg_net` (já habilitados se outros crons existem).
- Cria job `reconcile-pix-every-minute` chamando a edge function via `net.http_post` com `apikey` anon.

**Edge function `reconcile-pending-pix`:**
- `verify_jwt = false` (chamada por cron e pelo botão).
- Aceita opcionalmente `{ payment_id }` para verificar uma cobrança específica (botão); sem body, processa todas as pendentes.
- Reusa exatamente a lógica de ativação do `check-subscription-pix`.

**Mudanças em `create-mp-payment`:**
- Após gerar o PIX, faz `INSERT` em `pending_subscription_payments`.
- Após aprovar cartão, marca como `approved` (consistência).

**Mudanças em `check-subscription-pix` e `mp-webhook`:**
- Ao ativar, fazer `UPDATE pending_subscription_payments SET status='approved'` para o `payment_id`.

**Frontend `SubscriptionTab.tsx`:**
- Query `pending_subscription_payments` por org → se houver pendente < 30min, mostra card "Aguardando confirmação do PIX" com botão Verificar agora.

## Arquivos afetados
- novo: `supabase/migrations/<timestamp>_pending_pix_reconcile.sql`
- novo: `supabase/functions/reconcile-pending-pix/index.ts`
- editado: `supabase/config.toml` (adiciona `verify_jwt = false` para a nova função)
- editado: `supabase/functions/create-mp-payment/index.ts`
- editado: `supabase/functions/check-subscription-pix/index.ts`
- editado: `supabase/functions/mp-webhook/index.ts`
- editado: `src/components/dashboard/SubscriptionTab.tsx`

Posso seguir? Se aprovar, implemento tudo e te passo o passo-a-passo de como cadastrar o webhook no painel do MP no final.