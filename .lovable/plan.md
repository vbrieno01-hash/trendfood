
## Plano de teste end-to-end

Loja **TrendFood** está em Free agora. Vou rodar 4 verificações:

### 1. Estado inicial (read-only via SQL)
- Confirmar `subscription_plan='free'` e `trial_ends_at` expirado/null
- Contar quantos `menu_items` tem hoje na org `c9d9db45-...`

### 2. Teste manual (browser)
- Abrir `/dashboard` na aba **Cardápio**
- Se tiver < 30 itens: tentar criar itens até estourar o cap (criar item nº 31) e validar toast vermelho "Limite do plano Grátis atingido (30 itens)..."
- Se já tiver ≥ 30: tentar criar 1 item e validar bloqueio direto
- Confirmar via SQL que count **não aumentou** após o bloqueio

### 3. Teste de import CSV (browser)
- Abrir o diálogo "Importar Cardápio"
- Subir um CSV pequeno que, somado ao count atual, ultrapasse 30
- Validar toast de erro + confirmar via SQL que **nenhuma linha** foi inserida (all-or-nothing)

### 4. Limpeza
- Reportar resultados
- Você reverte a loja pra `lifetime` quando quiser

## Risco
Baixo. Vou criar no máximo 1-2 itens de teste com nomes claros tipo "TESTE_CAP_DELETAR" pra você apagar depois fácil. Se o count atual já estiver no limite, não preciso nem criar nada.

## Ferramentas
- `supabase--read_query` pra contar/verificar
- `browser--navigate_to_sandbox` + `browser--act` + `browser--screenshot` pro fluxo visual
- Se precisar de CSV de teste, gero em `/tmp/`

Começo agora pelo SQL pra ver o estado atual.
