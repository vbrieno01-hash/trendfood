
# Correções: Admin + Frete por Loja

## O que está errado hoje

### 1. E-mail do admin errado
O `AdminPage.tsx` usa `trendfoodapp@gmail.com` como e-mail admin, mas o correto é `brenojackson30@gmail.com`.

### 2. Frete global quando deveria ser por loja
O plano anterior foi implementado de forma errada em relação ao frete:
- A implementação atual usa `platform_config` (tabela global) para calcular o frete de TODAS as lojas
- `UnitPage.tsx` já busca `usePlatformDeliveryConfig()` e passa `globalDeliveryConfig` para `useDeliveryFee`
- `useDeliveryFee.ts` usa `globalConfig ?? DEFAULT_DELIVERY_CONFIG` — ignorando a config da loja
- `StoreProfileTab.tsx` removeu os campos de edição de taxa e virou só leitura da config global

**O correto:** cada loja tem liberdade total para configurar suas próprias taxas de frete. Isso é salvo em `organizations.delivery_config` e cada loja pode editar no painel dela.

---

## A solução

### Correção 1: E-mail do admin
`src/pages/AdminPage.tsx` linha 14:
```typescript
// DE:
const ADMIN_EMAILS = ["trendfoodapp@gmail.com"];
// PARA:
const ADMIN_EMAILS = ["brenojackson30@gmail.com"];
```

Além disso, corrigir o redirect: quando não há usuário logado, vai para `/auth` em vez de `/` (landing), e após o login redireciona de volta para `/admin`.

### Correção 2: Frete volta a ser por loja

**`src/hooks/useDeliveryFee.ts`**
Remover o parâmetro `globalConfig` e voltar a ler `org.delivery_config`:
```typescript
// Usa a config da LOJA, senão DEFAULT
const config: DeliveryConfig = {
  ...DEFAULT_DELIVERY_CONFIG,
  ...(org?.delivery_config ?? {}),
};
```

**`src/pages/UnitPage.tsx`**
Remover a busca de `usePlatformDeliveryConfig` e o parâmetro `globalDeliveryConfig` passado para `useDeliveryFee`.

**`src/components/dashboard/StoreProfileTab.tsx`**
Restaurar os campos editáveis de frete (faixa 1, faixa 2, faixa 3, limite km, frete grátis acima de) para que cada loja possa configurar sua própria taxa. Salvar em `organizations.delivery_config` ao clicar em Salvar.

Remover a dependência de `usePlatformDeliveryConfig` e o painel informativo "configurado globalmente".

### Correção 3: Redirect do Admin para login correto
**`src/pages/AdminPage.tsx`**
```typescript
// Sem usuário → vai para login com redirect de volta para /admin
if (!user) return <Navigate to="/auth?redirect=/admin" replace />;
// Com usuário mas sem permissão → home
if (!ADMIN_EMAILS.includes(user.email ?? "")) return <Navigate to="/" replace />;
```

**`src/pages/AuthPage.tsx`**
Ler parâmetro `redirect` da URL após login bem-sucedido:
```typescript
const redirectTo = new URLSearchParams(location.search).get("redirect") || "/dashboard";
navigate(redirectTo);
```

---

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/pages/AdminPage.tsx` | Corrigir e-mail para `brenojackson30@gmail.com` + redirect para `/auth?redirect=/admin` |
| `src/pages/AuthPage.tsx` | Ler parâmetro `redirect` pós-login |
| `src/hooks/useDeliveryFee.ts` | Remover `globalConfig`, voltar a usar `org.delivery_config` |
| `src/pages/UnitPage.tsx` | Remover `usePlatformDeliveryConfig`, não passar mais globalConfig |
| `src/components/dashboard/StoreProfileTab.tsx` | Restaurar campos editáveis de taxa de frete por loja |

**O `platform_config` e `usePlatformDeliveryConfig` continuam existindo** — são usados apenas no painel admin para o admin ver estatísticas futuras. A tabela não interfere mais nos fretes.
