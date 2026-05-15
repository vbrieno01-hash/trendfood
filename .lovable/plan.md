# Restringir card "Últimos eventos (debug homologação)" a admin + homologação

## Contexto
Hoje a aba **iFood** (`IFoodTab`) é renderizada quando:
- `featureFlags.ifood_enabled` (flag global) está ativa, **ou**
- `isAdmin` (brenojackson30@gmail.com), **ou**
- `ifoodBetaUser` (`vendass945@gmail.com`).

Quando a flag global liga, qualquer lojista no plano iFood vê a aba — e junto vem o card **"Últimos eventos (debug homologação)"** que mostra o log bruto do `ifood_event_log` (orderIds iFood, códigos CFM/CAR/etc.). Isso é informação de homologação, não deve aparecer pra lojistas.

## Mudança
Em `src/components/dashboard/IFoodTab.tsx`:

1. Importar `useAuth` e ler `user` + `isAdmin`.
2. Definir `canSeeDebug = isAdmin || user?.email?.toLowerCase() === "vendass945@gmail.com"`.
3. Renderizar o `<Card>` "Últimos eventos (debug homologação)" **somente quando** `canSeeDebug`.
4. No `load()`, pular a query em `ifood_event_log` quando `!canSeeDebug` (evita 1 round-trip e qualquer ruído de RLS pra usuários comuns).

Nada mais muda: conexão de merchant, polling, recover, status — tudo continua igual pra todos.

## Resultado
- brenojackson30@gmail.com → vê tudo (incluindo debug).
- vendass945@gmail.com → vê tudo (incluindo debug).
- Demais lojistas com iFood liberado → veem só a parte operacional (conectar merchant, status), **sem** o card de debug.

Sem migrações; mudança puramente frontend.
