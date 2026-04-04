

## Plano: Corrigir sufixo de período no checkout (trimestral mostra "/mês")

### Problema
O `CardPaymentForm.tsx` usa uma condição binária para o sufixo do período:
```
billing === "annual" ? "/ano" : "/mês"
```
Isso faz com que pagamentos trimestrais apareçam como "/mês" em dois lugares:
1. Na descrição do dialog: `R$ 267/mês` (deveria ser `/tri`)
2. No botão de submit: `Assinar por R$ 267/mês` (deveria ser `/tri`)

### Alteração

**`src/components/checkout/CardPaymentForm.tsx`** (único arquivo)

Substituir as 2 ocorrências do ternário `billing === "annual" ? "/ano" : "/mês"` por uma função helper que cobre os 3 ciclos:

- Linha 241 (descrição): trocar para `billing === "annual" ? "/ano" : billing === "quarterly" ? "/tri" : "/mês"`
- Linha 358 (botão): mesma correção

### Impacto
- 1 arquivo, 2 linhas
- Corrige a exibição do checkout para planos trimestrais em todas as 3 telas que usam `CardPaymentForm` (PricingPage, SubscriptionTab, UpgradeDialog)
