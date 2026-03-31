

## Plano: Limpeza completa na exclusão de unidade

### Problema
O `DeleteUnitDialog` não apaga **7 tabelas** e **arquivos de storage**, deixando dados órfãos ocupando espaço.

### Tabelas faltando na exclusão

| Tabela | Campo | Status atual |
|--------|-------|-------------|
| `global_addons` | `organization_id` | Não apagada |
| `global_addon_exclusions` | via `menu_item_id` | Não apagada |
| `delivery_neighborhoods` | `organization_id` | Não apagada |
| `referral_bonuses` | `referrer_org_id` / `referred_org_id` | Não apagada |
| `terms_acceptances` | `organization_id` | Não apagada |
| `activation_logs` | `organization_id` | Não apagada |
| `client_error_logs` | `organization_id` | Não apagada |

### Storage faltando

| Bucket | Caminho | O que guarda |
|--------|---------|-------------|
| `logos` | `{orgId}/logo.*` | Logo da loja |
| `menu-images` | `{orgId}/*` | Imagens dos itens |
| `menu-images` | `banners/{orgId}.*` | Banner da loja |

### Correção em `DeleteUnitDialog.tsx`

1. **Antes de deletar menu_items** — deletar `global_addon_exclusions` (depende de `menu_item_id`)
2. **No bloco de Promise.all (step 5)** — adicionar:
   - `global_addons` (por `organization_id`)
   - `delivery_neighborhoods` (por `organization_id`)
   - `referral_bonuses` (por `referrer_org_id` E `referred_org_id`)
   - `terms_acceptances` (por `organization_id`)
   - `activation_logs` (por `organization_id`)
   - `client_error_logs` (por `organization_id`)
3. **Storage cleanup** — antes de deletar a org:
   - Listar e remover arquivos em `logos/{orgId}/`
   - Listar e remover arquivos em `menu-images/{orgId}/`
   - Remover `menu-images/banners/{orgId}.*`

### Ordem de exclusão atualizada

```text
1. Fetch order IDs + menu_item IDs
2. Delete order_items (via order IDs)
3. Delete menu_item_addons + menu_item_ingredients + global_addon_exclusions (via menu_item IDs)
4. Delete deliveries (via organization_id)
5. Delete em paralelo: orders, menu_items, tables, cash_withdrawals, cash_sessions,
   coupons, suggestions, organization_secrets, stock_items, courier_shifts,
   couriers, fila_impressao, device_tokens, whatsapp_instances,
   global_addons, delivery_neighborhoods, referral_bonuses (x2),
   terms_acceptances, activation_logs, client_error_logs
6. Limpar storage (logos, menu-images, banners)
7. Delete organization
8. Verificar exclusão
```

### Arquivos alterados
- `src/components/dashboard/DeleteUnitDialog.tsx`

