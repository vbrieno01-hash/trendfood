

## Bug: Selo "Powered by TrendFood" aparece para TODOS os planos

### Problema encontrado
O hook `useOrganization` (usado no `UnitPage`) **não busca os campos `subscription_plan` e `trial_ends_at`** do banco de dados. A query SQL seleciona apenas campos específicos e omite esses dois. Resultado: `usePlanLimits` sempre recebe `undefined` e assume plano `"free"`, mostrando o selo para todas as lojas — inclusive as pagas.

### Correção

**Editar `src/hooks/useOrganization.ts` — linha 58:**

Adicionar `subscription_plan, trial_ends_at, subscription_status` na lista de campos do `.select()`.

De:
```
.select("id, name, slug, description, emoji, primary_color, logo_url, whatsapp, business_hours, store_address, delivery_config, pix_confirmation_mode, paused, printer_width, banner_url, courier_config, print_mode, cnpj")
```

Para:
```
.select("id, name, slug, description, emoji, primary_color, logo_url, whatsapp, business_hours, store_address, delivery_config, pix_confirmation_mode, paused, printer_width, banner_url, courier_config, print_mode, cnpj, subscription_status, subscription_plan, trial_ends_at")
```

Isso é a única mudança necessária. Após isso, o `usePlanLimits` receberá o plano correto e o selo será ocultado para lojas pagas.

