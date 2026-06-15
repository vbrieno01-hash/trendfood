## Etapa 2 — Refatorar `src/hooks/useLoyalty.ts`

Migrar os hooks públicos de loyalty para usar as RPCs `SECURITY DEFINER` criadas na Etapa 1, removendo o acesso direto às tabelas pelo cliente anônimo.

### Mudanças no arquivo `src/hooks/useLoyalty.ts`

1. **`useLoyaltyConfig`** → `supabase.rpc("get_loyalty_public_config", { _org_id })`
   - Mapeia o retorno para o tipo `LoyaltyConfig`

2. **`useLoyaltyPoints`** → `supabase.rpc("get_loyalty_points_by_phone", { _org_id, _phone })`
   - Mapeia o retorno para o tipo `LoyaltyPoints`

3. **`useAccumulateLoyalty`** → `supabase.rpc("accumulate_loyalty_points", { _org_id, _phone, _order_total })`
   - **Correção do bug**: a RPC retorna `integer` direto, não objeto.
   - Tratamento: `return typeof data === "number" && data > 0 ? { earnedPoints: data } : null;`
   - Parâmetro `spendPerPoint` mantido na assinatura como `_ignored` (compatibilidade com chamadores; o banco é fonte da verdade)

4. **`useRedeemLoyalty`** → `supabase.rpc("redeem_loyalty_points", { _org_id, _phone, _points_used, _discount_value, _order_id })`
   - Lock `FOR UPDATE` já está dentro da função SQL

### Mantidos intactos (dashboard autenticado, cobertos por `select_owner`)
- `useUpsertLoyaltyConfig`
- `useLoyaltyPointsList`
- `useLoyaltyRedemptions`

### Invalidação de cache
- `useQueryClient` em todas as mutations
- `onSuccess` invalida as query keys afetadas (`loyalty-points`, `loyalty-points-list`, `loyalty-redemptions`)

### Riscos
- Nenhum chamador externo precisa mudar — assinaturas dos hooks preservadas
- `spendPerPoint` passado pelos componentes passa a ser ignorado (intencional)

### Arquivo afetado
- `src/hooks/useLoyalty.ts` (reescrita completa do arquivo)
