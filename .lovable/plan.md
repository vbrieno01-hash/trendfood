

## Diagnóstico e Correção: Pagamentos com Preços Hardcoded nas Edge Functions

### Problemas Identificados

Analisando os logs:

1. **Cartão (`cc_rejected_high_risk`)**: O Mercado Pago recusou o cartão por risco — isso é avaliação do gateway, não bug de código. Porém, o valor está errado: a edge function envia R$ 5 para o plano "Enterprise" porque os preços são hardcoded.

2. **PIX**: A edge function `create-mp-payment` tem o mapa de preços `{ pro: 99.0, enterprise: 249.0 }` — **não inclui o plano "free"**, retornando "Invalid plan" quando o usuário tenta pagar.

3. **Raiz do problema**: Ambas as edge functions (`create-mp-subscription` e `create-mp-payment`) usam preços fixos no código, ignorando a tabela `platform_plans` do banco. Quando você altera preços no Admin, as funções de pagamento continuam cobrando valores antigos/errados.

### Alterações

#### 1. `create-mp-subscription/index.ts`
- Remover o mapa hardcoded `{ free: 5.0, pro: 99.0, enterprise: 249.0 }`
- Buscar o preço da tabela `platform_plans` usando o `plan` key recebido
- Corrigir o texto da razão que só diferencia "pro" vs "Enterprise" (ignorando outros planos)

#### 2. `create-mp-payment/index.ts`
- Remover o mapa hardcoded `{ pro: 99.0, enterprise: 249.0 }`
- Buscar o preço da tabela `platform_plans` usando o `plan` key recebido
- Incluir validação para planos com `price_cents = 0` (não permitir pagamento de plano gratuito)

### Resultado
Qualquer alteração de preço feita via Admin será automaticamente refletida nos pagamentos por cartão e PIX, eliminando a dessincronia.

