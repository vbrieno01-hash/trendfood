## Pré-preencher campos com credenciais atuais

### Edge function `ifood-update-platform-creds` (action `read`)
- Continua admin-only.
- Busca DB-first em `platform_secrets` (`IFOOD_CLIENT_ID`, `IFOOD_CLIENT_SECRET`); se vazio, faz fallback para `Deno.env.get(...)`.
- Retorna no JSON:
  - `current_client_id` (valor completo)
  - `current_client_secret` (valor completo)
  - `client_id_masked`, `client_secret_masked` (mantidos para exibição)
  - `db_configured`, `env_configured`, `active_source: "db" | "env" | "none"`
  - `updated_at`

### UI `IFoodHomologacaoTab.tsx`
- No `useEffect` que chama `read`, popular os inputs:
  - `setClientId(data.current_client_id || "")`
  - `setClientSecret(data.current_client_secret || "")`
- Toggle olho continua oculto por padrão (campos tipo `password`).
- Bloco "Atual" mostra origem ativa:
  - Verde "✓ Usando credenciais salvas no painel" se `active_source === "db"`
  - Verde "✓ Usando credenciais antigas do servidor" se `active_source === "env"`
  - Vermelho "⚠ Nenhuma credencial configurada" se `none`
- Aviso acima do botão: "Os campos vêm preenchidos com as credenciais atuais. Edite apenas quando o iFood liberar novas."
- Botão "Salvar e invalidar tokens antigos" continua exigindo os 2 campos preenchidos.

### O que NÃO muda
- `ifood-auth` (fallback DB → env já correto).
- Tabela `platform_secrets`, RLS e tokens em `ifood_credentials`.
- Lógica de invalidação ao salvar.

### Segurança
- Valores trafegam só dentro da função admin-only via HTTPS.
- Nada vai para `localStorage`.
- Inputs são `type="password"` por padrão, com toggle manual.
