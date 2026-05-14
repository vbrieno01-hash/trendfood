## Objetivo

Permitir que **você (admin)** altere as credenciais do iFood (`Client ID` / `Client Secret`) direto pelo painel `/admin`, sem precisar mexer em secrets do backend. Quando o iFood liberar as credenciais de produção, é só colar e salvar — todas as edge functions passam a usar as novas **imediatamente**, e tokens antigos das lojas são invalidados pra evitar o problema do "antigo ainda ficava" (igual aconteceu com o WhatsApp).

## O que vai ser construído

### 1. Armazenamento seguro no banco
Criar tabela nova **`platform_secrets`** (`key`, `value`, `updated_at`):
- RLS: SELECT e UPDATE **somente admin** (`has_role(auth.uid(), 'admin')`)
- Edge functions leem via **service role** (bypassa RLS)
- Não fica exposta como o `platform_config` (que tem SELECT público)

> Não dá pra usar `platform_config` porque ele tem `SELECT public` — secret iria vazar.

### 2. UI no Admin
Adicionar uma seção **"Credenciais iFood"** dentro da aba `iFood Homologação` (componente `IFoodHomologacaoTab`):
- 2 inputs: `Client ID` e `Client Secret` (com toggle mostrar/ocultar)
- Mostra valor atual mascarado (ex: `abc1...xyz9`)
- Botão **Salvar**: grava em `platform_secrets` + invalida todos os tokens em `ifood_credentials` (zera `access_token`, `refresh_token`, `token_expires_at`, marca `status='disconnected'`) → forçando re-autenticação na próxima chamada
- Aviso claro: "Ao salvar, todas as lojas conectadas vão precisar reconectar (re-vincular merchant)."

### 3. Edge functions usam DB-first, env-fallback
Atualizar as 4 edge functions (`ifood-auth`, `ifood-poll-events`, `ifood-update-status`, `ifood-cancellation-reasons`) pra ler credenciais com helper único:

```ts
async function getIfoodCreds(serviceClient) {
  const { data } = await serviceClient
    .from("platform_secrets")
    .select("key, value")
    .in("key", ["IFOOD_CLIENT_ID", "IFOOD_CLIENT_SECRET"]);
  const map = Object.fromEntries((data ?? []).map(r => [r.key, r.value]));
  return {
    clientId: map.IFOOD_CLIENT_ID || Deno.env.get("IFOOD_CLIENT_ID"),
    clientSecret: map.IFOOD_CLIENT_SECRET || Deno.env.get("IFOOD_CLIENT_SECRET"),
  };
}
```

Assim:
- Se você setar pelo admin → usa o do admin
- Se não setou → continua usando os secrets atuais (`IFOOD_CLIENT_ID` / `IFOOD_CLIENT_SECRET`) — zero quebra agora

### 4. Garantia "anti-resíduo" (lição do WhatsApp)
A operação de salvar é uma **transação SQL** (via edge function `ifood-update-platform-creds`):
1. `UPSERT` em `platform_secrets`
2. `UPDATE ifood_credentials SET access_token=NULL, refresh_token=NULL, token_expires_at=NULL, status='disconnected'` (todas as lojas)
3. Retorna quantas lojas foram desconectadas

Isso garante que **nenhum token antigo continua válido em cache**.

## Detalhes técnicos

**Migração:**
```sql
CREATE TABLE public.platform_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_select" ON public.platform_secrets FOR SELECT USING (has_role(auth.uid(),'admin'));
CREATE POLICY "admin_all"    ON public.platform_secrets FOR ALL    USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
```

**Nova edge function:** `ifood-update-platform-creds` (verify_jwt = true, valida que o user é admin)
- Input: `{ client_id, client_secret }`
- Faz UPSERT + invalida tokens
- Output: `{ success: true, disconnected_count: N }`

**Arquivos modificados:**
- `supabase/functions/ifood-auth/index.ts` — usa helper
- `supabase/functions/ifood-poll-events/index.ts` — usa helper
- `supabase/functions/ifood-update-status/index.ts` — usa helper
- `supabase/functions/ifood-cancellation-reasons/index.ts` — usa helper
- `supabase/functions/ifood-update-platform-creds/index.ts` — **novo**
- `src/components/admin/IFoodHomologacaoTab.tsx` — adiciona seção de credenciais

## O que NÃO muda
- Secrets `IFOOD_CLIENT_ID` / `IFOOD_CLIENT_SECRET` continuam existindo como fallback
- Fluxo do lojista de conectar loja iFood (não muda nada pra ele, só vai precisar reconectar 1x quando você trocar a credencial)
- Nenhuma outra parte do sistema é afetada