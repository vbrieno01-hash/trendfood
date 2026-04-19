
## Estado atual

Loja TrendFood está com `subscription_plan='free'`, mas precisei verificar o `trial_ends_at` — se ainda estiver no futuro, o `checkMenuItemLimit.ts` trata como `pro` (trialActive) e o cap de 30 não é aplicado.

## Plano de teste

### 1. Verificar via SQL
- `subscription_plan`, `trial_ends_at`, `used_first_month_promo` da org `c9d9db45-...`
- Count atual de `menu_items`
- Se `trial_ends_at` estiver no futuro: pedir pro user expirar (ou criar migration temporária)

### 2. Teste manual no browser
- `/dashboard` → aba Cardápio
- Se count < 30: criar itens "TESTE_CAP_DELETAR_N" até chegar a 30
- Tentar criar item nº 31 → validar toast "Limite do plano Grátis atingido (30 itens)..."
- SQL: confirmar count = 30 (não 31)

### 3. Teste CSV import
- Gerar `/tmp/teste_cap.csv` com 5 produtos
- Abrir diálogo "Importar Cardápio" → subir CSV
- Validar toast de erro + SQL confirma count inalterado

### 4. Reportar
- Resultados claros (passou / falhou em cada etapa)
- Lembrar você de: (a) deletar itens "TESTE_CAP_DELETAR_*", (b) reverter `subscription_plan` pra `lifetime`

## Pré-requisito bloqueante

Antes de começar preciso checar `trial_ends_at`. Se estiver no futuro, **não dá pra testar** — o código trata Free + trial ativo como Pro (sem cap). Cenários:

- **trial expirado/null** → testo direto ✅
- **trial no futuro** → te peço pra setar `trial_ends_at = now() - interval '1 day'` antes de eu rodar

Começo pelo SQL pra confirmar.
