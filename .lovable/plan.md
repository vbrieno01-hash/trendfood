

# Plano: Redirecionar de volta para assinatura após login

## Problema
Quando um usuário não logado clica em "Assinar Pro" na página `/planos`, ele é levado para `/auth` e após login vai para `/dashboard` — perdendo a intenção de assinar.

## Alterações

### 1. `src/pages/PricingPage.tsx`
- Ao clicar num plano sem estar logado, navegar para `/auth?redirect=/planos&plan=<key>` em vez de apenas `/auth`
- No `useEffect` inicial, verificar query param `plan` — se o usuário acabou de voltar logado, abrir automaticamente o dialog de confirmação do plano selecionado

### 2. `src/pages/AuthPage.tsx`
- Já suporta `?redirect=` via `searchParams.get("redirect")` — nenhuma alteração necessária

### Fluxo resultante
1. Usuário clica "Assinar Pro" → vai para `/auth?redirect=/planos&plan=pro`
2. Faz login/cadastro → redirecionado para `/planos?plan=pro`
3. PricingPage detecta `?plan=pro` com usuário logado → abre dialog de confirmação automaticamente

