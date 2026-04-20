

## Plano — rotina automática de limpeza de banner_url quebrado

### O que será feito

Criar uma defesa em 2 camadas para garantir que `banner_url` apontando para arquivo inexistente nunca mais persista no banco:

### 1. Edge Function `cleanup-broken-banners` (camada servidor)

Nova função em `supabase/functions/cleanup-broken-banners/index.ts` que:

- Roda com `SERVICE_ROLE_KEY` (mesmo padrão da `cleanup-phantom-orders`)
- Lista todas as organizations onde `banner_url IS NOT NULL`
- Para cada uma, faz um `HEAD` no `banner_url`
- Se a resposta for 4xx (400/403/404) → executa `UPDATE organizations SET banner_url = NULL WHERE id = ...`
- Retorna JSON com quantos banners foram limpos e quais lojas
- Configurada com `verify_jwt = false` em `supabase/config.toml` (para poder ser chamada pelo pg_cron)

### 2. Agendamento via pg_cron (execução automática)

Migration que agenda a função para rodar **1x por dia às 3h da manhã** (horário de baixo movimento):

```sql
select cron.schedule(
  'cleanup-broken-banners-daily',
  '0 3 * * *',
  $$ select net.http_post(
       url:='https://xrzudhylpphnzousilye.supabase.co/functions/v1/cleanup-broken-banners',
       headers:='{"Content-Type":"application/json"}'::jsonb,
       body:='{}'::jsonb
     ); $$
);
```

Como já é diária e leve (apenas N requisições HEAD onde N = número de lojas com banner), o custo é desprezível.

### 3. Defesa imediata no cliente (camada vitrine)

Em `UnitPage.tsx` o `<img>` do banner já tem `onError` que esconde o elemento (linha 917-919). Vou estender para também **disparar fire-and-forget um `UPDATE banner_url = NULL`** no banco quando a imagem falhar, usando o `id` da org. Assim, a primeira pessoa que abre uma loja com banner morto já limpa o fantasma — mesmo antes do cron rodar.

Proteção: só limpa se `org.user_id` está disponível ou a chamada bate em uma policy pública de update? → na verdade, vou fazer via **chamada à mesma edge function** com `{org_id}` opcional, que aceita um parâmetro para validar e limpar só aquela loja específica (sem precisar de auth).

### Arquivos afetados

- `supabase/functions/cleanup-broken-banners/index.ts` — nova edge function
- `supabase/config.toml` — adicionar `[functions.cleanup-broken-banners] verify_jwt = false`
- migração SQL — agendar pg_cron diário
- `src/pages/UnitPage.tsx` — `onError` do banner também chama a função com `org_id` para limpeza imediata

### Resultado esperado

- A cada 24h, a plataforma escaneia automaticamente todos os banners e limpa os quebrados sem intervenção manual
- Quando um cliente abre uma loja com banner morto, a vitrine **se autocorrige na hora** — o lojista nem percebe o problema
- Nunca mais teremos lojas com `banner_url` "fantasma" no banco

