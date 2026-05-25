## Problema

A coluna **Último login** mostra "1mes", "2mes" para lojas que estão **online e ativas** todo dia. Isso acontece porque o Supabase só atualiza `last_sign_in_at` quando o usuário digita senha de novo — refresh automático de token (PWA/APK sempre logado) **não conta**. Então o número não reflete uso real.

## Solução

Trocar a coluna por **Última atividade**, calculada como o **maior valor** entre estes sinais reais de uso:

1. `MAX(orders.created_at)` das organizações do usuário — pedido recebido = loja operando.
2. `MAX(organizations.updated_at)` — qualquer mudança no painel (mexer em cardápio, status, configurações).
3. `last_sign_in_at` como fallback (caso a loja nunca tenha pedido nem editado nada).

Quem tiver pedido hoje aparece "agora / Xh"; quem só configurou e abandonou continua aparecendo "1mes".

## O que muda

**1. Migração SQL** — recriar a função `admin_list_users` para incluir o campo `last_activity_at`:

```sql
SELECT
  u.id, u.email, u.created_at, u.last_sign_in_at,
  GREATEST(
    COALESCE(act.last_order_at, 'epoch'::timestamptz),
    COALESCE(act.last_org_update, 'epoch'::timestamptz),
    COALESCE(u.last_sign_in_at, 'epoch'::timestamptz)
  ) AS last_activity_at,
  ...
FROM auth.users u
LEFT JOIN (
  SELECT o.user_id,
         MAX(ord.created_at) AS last_order_at,
         MAX(o.updated_at)   AS last_org_update
  FROM public.organizations o
  LEFT JOIN public.orders ord ON ord.organization_id = o.id
  GROUP BY o.user_id
) act ON act.user_id = u.id
```

**2. `src/components/admin/CapacityTab.tsx`:**
- Adicionar `last_activity_at` à interface `AdminUser`.
- Renomear o cabeçalho da coluna de **"Último login"** → **"Última atividade"**.
- Trocar a célula para renderizar `fmtRelative(u.last_activity_at)` em vez de `u.last_sign_in_at`.
- Manter a coluna "CADASTRO" como está (já está correta).

Nada mais muda — filtros, exclusão, promover admin, tudo continua igual.
