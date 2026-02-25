

# Plano: Corrigir texto e deixar link universal fixo no painel

## O que voce pediu

1. O link novo pronto para copiar
2. Deixar fixo no painel para copiar quando precisar
3. Corrigir o texto que diz "Cakto, Kiwify, Hotmart" --- o webhook e universal, funciona com **qualquer plataforma**

## Seu link universal

```
https://xrzudhylpphnzousilye.supabase.co/functions/v1/universal-activation-webhook?email={email}&days=30&plan=pro&secret=trendfood123
```

O `{email}` sera substituido automaticamente pelo gateway com o email do comprador. Funciona com **qualquer plataforma de pagamento** que envie webhook --- nao apenas Cakto, Kiwify ou Hotmart.

## O que muda

### Corrigir texto na aba Ativacoes (linha 150-152)

O texto atual diz:
> "Compativel com Cakto, Kiwify, Hotmart."

Vai mudar para:
> "Compativel com qualquer plataforma de pagamento que envie webhook (Cakto, Kiwify, Hotmart, Eduzz, Monetizze, Stripe, etc)."

Isso deixa claro que e **universal** e nao limitado a 3 gateways.

### Arquivo alterado

```text
EDIT: src/components/admin/ActivationLogsTab.tsx
  - Linha 150-152: Atualizar texto descritivo para deixar claro que e universal
```

Mudanca minima --- apenas o texto descritivo. O link ja esta fixo e funcional no painel.

