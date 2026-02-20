
# Correção: Horário de Funcionamento resetando ao trocar de aba

## Problema
O campo `business_hours` não está sendo carregado na query do `useAuth.tsx`. Quando você navega para outra aba e volta, o componente re-monta e recebe `organization.business_hours = undefined`, que cai no valor padrão com `enabled: false`.

## Solução
Adicionar `business_hours` na query SELECT do `fetchOrganization` dentro do `useAuth.tsx`.

## Detalhes técnicos
Uma única linha precisa ser alterada no arquivo `src/hooks/useAuth.tsx`:

Na função `fetchOrganization`, a query atual é:
```
.select("id, name, slug, description, emoji, primary_color, logo_url, user_id, created_at, whatsapp, subscription_status, subscription_plan, onboarding_done, trial_ends_at, pix_key, paused")
```

Será atualizada para incluir `business_hours`:
```
.select("id, name, slug, description, emoji, primary_color, logo_url, user_id, created_at, whatsapp, subscription_status, subscription_plan, onboarding_done, trial_ends_at, pix_key, paused, business_hours")
```

Também será adicionado `business_hours` na interface `Organization` do `useAuth.tsx` para manter a tipagem correta.
