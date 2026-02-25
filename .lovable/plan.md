

# Plano: Gestão Manual de Assinaturas + Webhook Universal + Log de Ativações

## O que será feito

1. **Diálogo "Gerenciar Assinatura"** em cada card de loja na aba Lojas do Admin, com:
   - Seletor de plano (free/pro/enterprise/lifetime)
   - Seletor de status (active/past_due)
   - Calendário para definir `trial_ends_at` com data exata
   - Botão salvar que registra a alteração no log

2. **Tabela `activation_logs`** para rastrear todas as ativações manuais e via webhook, com campos: org_id, org_name, old_plan, new_plan, source (manual/webhook), admin_email, created_at

3. **Edge Function `universal-activation-webhook`** que recebe `org_id` e `days` via query params e ativa o plano pro + estende trial, sem depender de gateway específico

4. **Aba "Ativações" no Admin** para visualizar o log de ativações

## Seção técnica

### 1. Nova tabela: `activation_logs`

```sql
CREATE TABLE public.activation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  org_name text,
  old_plan text,
  new_plan text,
  old_status text,
  new_status text,
  source text NOT NULL DEFAULT 'manual',  -- 'manual' | 'webhook'
  admin_email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activation_logs ENABLE ROW LEVEL SECURITY;
-- SELECT/INSERT/DELETE apenas para admin
```

### 2. Edge Function: `universal-activation-webhook`

Endpoint: `GET /universal-activation-webhook?org_id=xxx&days=30&secret=YOUR_SECRET`

- Valida secret via query param contra env `UNIVERSAL_WEBHOOK_SECRET`
- Busca org pelo id
- Atualiza `subscription_plan = 'pro'`, `subscription_status = 'active'`, `trial_ends_at = now() + days`
- Insere registro em `activation_logs` com `source = 'webhook'`
- Retorna JSON com sucesso

Config em `supabase/config.toml`: `verify_jwt = false`

### 3. Componente: Diálogo "Gerenciar Assinatura"

No `StoreCard` existente, substituir o seletor de plano simples por um botão "Gerenciar" que abre um `Dialog` com:
- Select de plano
- Select de status (active / past_due)
- DatePicker para `trial_ends_at`
- Campo de notas (opcional)
- Ao salvar: atualiza org no banco + insere `activation_logs` com `source = 'manual'`

### 4. Aba "Ativações" no Admin

Nova tab no sidebar com listagem da tabela `activation_logs` ordenada por `created_at DESC`, mostrando: data, loja, plano anterior → novo, fonte (manual/webhook), admin.

### Arquivos criados/alterados

```text
NOVO:  migration SQL (activation_logs)
NOVO:  supabase/functions/universal-activation-webhook/index.ts
EDIT:  supabase/config.toml (adicionar verify_jwt = false para nova function)
EDIT:  src/pages/AdminPage.tsx (diálogo de gestão no StoreCard, nova aba "Ativações", log)
```

### Secret necessário

- `UNIVERSAL_WEBHOOK_SECRET` — um token que você define e coloca na URL do webhook em qualquer gateway

### Fluxo de uso

```text
Gateway (Cakto/Kiwify/Hotmart)
  └─ Webhook URL: https://.../universal-activation-webhook?org_id=UUID&days=30&secret=TOKEN
       └─ Edge Function valida secret
            └─ Atualiza org → plan=pro, status=active, trial_ends_at=now()+30d
                 └─ Insere activation_logs (source=webhook)

Admin Panel → Aba Lojas → Card da loja → "Gerenciar"
  └─ Dialog com plano, status, calendário
       └─ Salva no banco + insere activation_logs (source=manual)

Admin Panel → Aba Ativações
  └─ Tabela com histórico completo
```

