

# Alterar status da organização "Burguer do Rei"

## O que sera feito

Atualizar o campo `subscription_status` de `trial` para `active` na organização "Burguer do Rei" (ID: `f1f75304-35cc-403c-b097-fd7dddcf9047`), mantendo `subscription_plan` como `free`.

## Resultado esperado

Com `subscription_status = 'active'` e `subscription_plan = 'free'`, o hook `usePlanLimits` deixara de conceder acesso Pro (que era dado pelo trial) e aplicara as restricoes do plano gratuito:

- Cadeados visiveis na sidebar para: Cupons, Mais Vendidos, Cozinha (KDS), Painel do Garcom, Caixa
- UpgradePrompt exibido ao clicar nessas tabs
- Limite de 20 itens no cardapio
- Limite de 1 mesa
- Historico restrito a 7 dias

## Detalhes tecnicos

Uma unica query de UPDATE no banco de dados:

```sql
UPDATE organizations
SET subscription_status = 'active'
WHERE id = 'f1f75304-35cc-403c-b097-fd7dddcf9047';
```

Nenhuma alteracao de codigo e necessaria.

