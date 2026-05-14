# Plano — Liberar iFood para `vendass945@gmail.com`

## Mudança

Hoje a aba **iFood** mostra o placeholder "EM BREVE" para todo mundo, exceto o admin (`brenojackson30@gmail.com`). Gate em `src/pages/DashboardPage.tsx:1081`:

```tsx
!featureFlags?.ifood_enabled && !isAdmin
```

Adicionar uma allowlist de emails de teste para passar pelo mesmo gate, sem mexer em `featureFlags` (continua "EM BREVE" pros outros).

```tsx
const IFOOD_BETA_EMAILS = ["vendass945@gmail.com"];
const ifoodBetaUser = !!user?.email && IFOOD_BETA_EMAILS.includes(user.email.toLowerCase());

// gate vira:
!featureFlags?.ifood_enabled && !isAdmin && !ifoodBetaUser
```

`user` já vem de `useAuth()` na linha 73 do mesmo arquivo, então não há import novo.

## Onde mexer

- **`src/pages/DashboardPage.tsx`** — declarar a constante perto do topo do componente e ajustar a condição na linha 1081.

## O que NÃO muda

- Nada em `supabase/`, `.env`, `package.json`, RLS, edge functions, plano de assinatura.
- `lockedFeatures.ifood` (gate por plano Pro/Enterprise) continua valendo — o usuário precisa estar em um plano que libere iFood. Se o `vendass945@gmail.com` estiver no Free, ele veria o `UpgradePrompt`. Posso opcionalmente também pular esse gate pra ele — me confirma se quer (provavelmente sim, pra teste de homologação).
- Nenhum outro usuário vê diferença.

## Reversão

Apagar o email da lista `IFOOD_BETA_EMAILS` quando o rollout for global (ou mudar `featureFlags.ifood_enabled` no admin pra true).
