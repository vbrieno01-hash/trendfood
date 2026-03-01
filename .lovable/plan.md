

## Problemas encontrados no fluxo anual

Analisei todo o fluxo de ponta a ponta e encontrei **2 bugs** que precisam ser corrigidos:

### Bug 1: `create-mp-subscription` — valor e frequência incorretos

No código atual (linha 134-136):
```
frequency: isAnnual ? 12 : 1,
frequency_type: "months",
transaction_amount: isAnnual ? amount / 12 : amount,
```

Isso diz ao Mercado Pago: "cobre R$ 82,50 a cada 12 meses" — ou seja, o cliente pagaria R$ 82,50 por **ano**. O correto é uma das duas abordagens:

- **Opção A** (cobrar o valor cheio anual de uma vez): `frequency: 12, transaction_amount: 990`
- **Opção B** (cobrar mensalmente o equivalente): `frequency: 1, transaction_amount: 82.50` — mas aí não é realmente "anual"

**Correção recomendada (Opção A):** Cobrar o valor cheio a cada 12 meses:
```
frequency: isAnnual ? 12 : 1,
frequency_type: "months",
transaction_amount: amount,  // sem dividir por 12
```

### Bug 2: `mp-webhook` — renovação de dias fixa em +35 para qualquer ciclo

Quando o webhook recebe a aprovação da assinatura ou pagamento recorrente, ele sempre concede **+35 dias**. Para assinaturas anuais, deveria conceder **+370 dias** (365 + margem de segurança).

**Correção:** No `mp-webhook`, ao ativar a assinatura (preapproval authorized) e ao renovar (payment approved), consultar o `billing_cycle` da org e usar:
- `monthly` → +35 dias
- `annual` → +370 dias

### Alterações necessárias

1. **`supabase/functions/create-mp-subscription/index.ts`** (linha 136):
   - Remover a divisão `amount / 12` — usar `amount` diretamente

2. **`supabase/functions/mp-webhook/index.ts`**:
   - Nas 3 ocorrências onde calcula `trialEnds` (+35 dias), adicionar leitura do `billing_cycle` da org e usar +370 dias se anual
   - Ajustar a query `select` da org para incluir `billing_cycle`

### Resumo

| Aspecto | Antes (bug) | Depois (corrigido) |
|---|---|---|
| Valor cobrado anual MP | R$ 82,50/12 meses | R$ 990/12 meses |
| Dias concedidos mensal | +35 dias | +35 dias (sem mudança) |
| Dias concedidos anual | +35 dias | +370 dias |

