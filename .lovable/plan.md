## Objetivo
Tornar a integração com Uazapi 100% dinâmica, com credenciais mestre configuráveis pelo Admin e um toggle por loja ("Permitir Robô de WhatsApp") controlando o acesso ao recurso.

## O que já existe (vamos reaproveitar)
- Edge functions `uazapi-create-instance`, `uazapi-disconnect`, `uazapi-instance-status`, `whatsapp-webhook` — já criam instância, configuram webhook (`events: ["messages"]`) e retornam QR.
- Tabela `whatsapp_instances` (token, status, webhook_configured, phone_connected).
- Tela do lojista (`AIBotTab`) que renderiza QR e faz polling.
- Flag global `platform_config.whatsapp_enabled` (libera/desabilita o recurso globalmente).

## O que falta (foco desta entrega)

### 1. Credenciais mestre Uazapi configuráveis pelo Admin
Hoje `UAZAPI_SERVER_URL` e `UAZAPI_ADMIN_TOKEN` são secrets de ambiente fixos. Vamos:
- Adicionar 2 colunas em `platform_config`: `uazapi_server_url text` e `uazapi_admin_token text` (token guardado server-side; nunca exposto ao cliente).
- Ajustar policy de SELECT para esconder o token do público (apenas admin lê o token; demais campos continuam públicos).
- Criar seção "Uazapi (WhatsApp Master)" dentro do painel Admin → aba Capacidade/Plataforma com 2 inputs (URL + Token mascarado) e botão "Testar conexão" (chama `uazapi-server-info`).
- Edge functions passam a ler primeiro do `platform_config`; se vazio, caem no env var (compatibilidade).

### 2. Toggle por loja "Permitir Robô de WhatsApp"
- Nova coluna `organizations.whatsapp_bot_allowed boolean NOT NULL DEFAULT false`.
- Apenas admin pode alterar (via policy já existente de admin) — criamos RPC `admin_set_whatsapp_bot_allowed(org_id, allowed)` para garantir.
- No `AdminStoreManager` (lista de lojas): adicionar uma coluna/switch "Robô WhatsApp" em cada linha, com toast de confirmação.

### 3. Gating no dashboard do lojista
- `AIBotTab` já checa `whatsapp_enabled` global. Adicionar checagem da flag por loja:
  - Se `whatsapp_bot_allowed = false` → tela bloqueada com mensagem amigável:
    > "O recurso de Robô de WhatsApp não está ativo no seu plano. Entre em contato com o suporte para liberar."
  - Botão "Falar com suporte" abre o `SupportChatWidget`.
- Edge function `uazapi-create-instance` valida server-side `whatsapp_bot_allowed` antes de criar instância (defesa em profundidade) e retorna 403 amigável.

### 4. Tratamento de limite de instâncias
- Em `uazapi-create-instance`, se Uazapi devolver 402/429/erro de quota, propagar mensagem clara ("Limite de instâncias Uazapi atingido — contate o admin"); admin recebe notificação via Telegram (`notify_admin_telegram` com novo evento `uazapi_quota_exceeded`).

## Detalhes técnicos

**Migration:**
```sql
ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS uazapi_server_url text,
  ADD COLUMN IF NOT EXISTS uazapi_admin_token text;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS whatsapp_bot_allowed boolean NOT NULL DEFAULT false;

-- Esconder admin_token do público: trocar policy de SELECT por view/coluna mascarada
CREATE OR REPLACE VIEW public.platform_config_public AS
  SELECT id, delivery_config, apk_url, exe_url, default_trial_days,
         ifood_enabled, whatsapp_enabled, uazapi_server_url,
         (uazapi_admin_token IS NOT NULL) AS uazapi_configured
  FROM public.platform_config;
GRANT SELECT ON public.platform_config_public TO anon, authenticated;

-- RPC admin
CREATE OR REPLACE FUNCTION public.admin_set_whatsapp_bot_allowed(_org_id uuid, _allowed boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.organizations SET whatsapp_bot_allowed=_allowed WHERE id=_org_id;
END $$;
```

**Frontend:**
- `usePlatformFeatureFlags` → adiciona `uazapi_configured`, `uazapi_server_url`.
- Novo componente `UazapiMasterConfigSection` (Admin).
- `AdminStoreManager` → coluna Switch ligada ao RPC.
- `AIBotTab` → busca `whatsapp_bot_allowed` da própria org e exibe `LockedFeatureBanner` se false.

**Edge functions:**
- Helper `getUazapiConfig(supabase)` que lê `platform_config` (token via service_role) com fallback para env.
- `uazapi-create-instance`: 1) checa `whatsapp_bot_allowed`; 2) usa config dinâmica; 3) tratamento de quota.

## Fora do escopo
- Não alterar fluxo do webhook nem do bot AI (já funcionam).
- Não mexer em design/tema; reuso de `admin-glass`, `Switch`, `LockedFeatureBanner`.