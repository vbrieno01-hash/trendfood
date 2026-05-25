
# Multi-loja completo no Robô WhatsApp

Hoje cada loja já tem sua própria instância uazapi isolada (token único, webhook próprio, owner-check no servidor). Faltam 4 ajustes pra ficar 100% pronto pra qualquer lojista usar com segurança:

## 1. Config do bot por loja (não mais singleton)

Hoje `ai_bot_config` tem 1 linha global — prompt do "Lucas" e modelo compartilhados entre todas as lojas.

- Adicionar coluna `organization_id uuid` em `ai_bot_config` (nullable pra preservar o singleton atual como "default global").
- Índice único parcial `WHERE organization_id IS NOT NULL` (1 config por loja).
- RLS: dono da org lê/edita a config da própria org; admin lê/edita tudo; singleton (org_id NULL) só admin.
- Trigger que cria automaticamente uma linha pra org quando a loja conecta a 1ª instância, copiando defaults do singleton.
- `AIBotTab.tsx`: passar a buscar `ai_bot_config` filtrando `organization_id = orgId` em vez de `.limit(1)`.

## 2. Isolar a fila de mensagens por loja

`fila_whatsapp` não tem `organization_id` — se outra loja ativar o robô, mensagens se misturam no painel.

- Adicionar `organization_id uuid` em `fila_whatsapp` + índice.
- Webhook (`whatsapp-webhook`): preencher `organization_id` ao inserir, baseado no `instance_token` (já é resolvido lá).
- RLS: dono da org vê só a fila da própria org; admin vê tudo.
- `AIBotTab.tsx`: filtrar `.eq("organization_id", orgId)` no select e no realtime channel.

## 3. Liberar pra todas as lojas (com gating de plano)

Hoje só `BETA_ORG_IDS = TrendFood` vê o painel completo do bot.

- Remover o `BETA_ORG_IDS` hardcoded.
- Manter `usePlatformFeatureFlags().whatsapp_enabled` como kill-switch global do admin.
- Adicionar gate por plano: robô IA só liga no **Pro/Enterprise** (gate via trigger `gate_ai_bot_enabled_paid_plan` quando `enabled=true`, igual aos outros gates já existentes — cupons, loyalty, etc).
- Free pode conectar WhatsApp pra avisos automáticos (`WhatsAppAutoStatusCard`), mas não pra IA conversacional.

## 4. Limite de instâncias por usuário

Sem limite hoje, um usuário com 50 orgs cria 50 instâncias no uazapi (custo).

- Em `uazapi-create-instance`: antes de criar, contar quantas instâncias ativas o `user_id` já tem (via join `whatsapp_instances`→`organizations`). Limite hardcoded: **3 instâncias por usuário** (admin bypassa).
- Retornar 403 com mensagem clara se exceder.

## Detalhes técnicos

**Migrations (1 só, atômica):**
```sql
-- ai_bot_config por org
ALTER TABLE ai_bot_config ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX ai_bot_config_org_unique ON ai_bot_config(organization_id) WHERE organization_id IS NOT NULL;

-- RLS por owner
DROP POLICY ai_bot_config_select_admin ON ai_bot_config;  -- recria abrindo pra owner também
CREATE POLICY ai_bot_config_select_owner ON ai_bot_config
  FOR SELECT USING (
    organization_id IS NOT NULL
    AND auth.uid() = (SELECT user_id FROM organizations WHERE id = ai_bot_config.organization_id)
  );
-- (políticas equivalentes pra UPDATE e INSERT do owner)

-- fila_whatsapp por org
ALTER TABLE fila_whatsapp ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX fila_whatsapp_org_idx ON fila_whatsapp(organization_id, created_at DESC);

CREATE POLICY fila_whatsapp_select_owner ON fila_whatsapp
  FOR SELECT USING (
    organization_id IS NOT NULL
    AND auth.uid() = (SELECT user_id FROM organizations WHERE id = fila_whatsapp.organization_id)
  );

-- Gate de plano pro bot IA
CREATE FUNCTION gate_ai_bot_enabled_paid_plan() RETURNS trigger AS $$
BEGIN
  IF NEW.enabled = true
     AND NEW.organization_id IS NOT NULL
     AND get_effective_plan(NEW.organization_id) = 'free'
  THEN
    RAISE EXCEPTION 'Robô de WhatsApp disponível apenas no plano Pro.' USING ERRCODE='P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path=public;

CREATE TRIGGER tg_gate_ai_bot BEFORE INSERT OR UPDATE ON ai_bot_config
  FOR EACH ROW EXECUTE FUNCTION gate_ai_bot_enabled_paid_plan();
```

**Edge functions:**
- `uazapi-create-instance`: adicionar verificação de limite (3 instâncias / user, admin bypassa); ao criar instância, fazer `INSERT ai_bot_config (organization_id, system_prompt, model, greeting_message) SELECT $1, system_prompt, model, greeting_message FROM ai_bot_config WHERE organization_id IS NULL` se não existir ainda.
- `whatsapp-webhook`: ao inserir em `fila_whatsapp`, passar `organization_id: matchedInst.organization_id`. Ao buscar config do bot, usar `WHERE organization_id = matchedInst.organization_id`.

**Frontend (`src/components/dashboard/AIBotTab.tsx`):**
- Remover `BETA_ORG_IDS` e `isBeta`; `BetaPanel` vira `BotPanel` exibido sempre que `waEnabled`.
- `loadAll`: `ai_bot_config.eq("organization_id", orgId)`, `fila_whatsapp.eq("organization_id", orgId)`.
- Realtime channel com filter `organization_id=eq.${orgId}`.
- Se plano = free, mostrar `UpgradePrompt` em vez do switch "Ativar bot".

## O que NÃO muda

- Isolamento de instância uazapi (já correto).
- Owner-check nas edge functions (já correto).
- `WhatsAppAutoStatusCard` (avisos automáticos de pedido) — segue aberto pra todos os planos.
- Admin panel `WhatsAppInstancesTab` — sem mudanças.

Posso seguir e implementar?
