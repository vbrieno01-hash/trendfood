
# Atualizar Status do Controle de Caixa no Painel Admin

## O que será feito

A imagem enviada mostra a seção "Funcionalidades da Plataforma" no `/admin`. O **Controle de Caixa** aparece como **"Em breve"**, mas a funcionalidade já está completamente implementada. O objetivo é:

1. Atualizar o status de `"soon"` para `"available"` no card do Controle de Caixa
2. Adicionar link de ação "Ver no dashboard" apontando para `/dashboard`
3. Corrigir o aviso de console `Function components cannot be given refs` no `AdminPage.tsx`

---

## Verificação do estado atual

### Banco de dados — funcionando ✅
- Tabelas `cash_sessions` e `cash_withdrawals` criadas com RLS
- Dados reais: 2 sessões fechadas e 1 sangria registrada nos testes anteriores

### Hooks — funcionando ✅
- `src/hooks/useCashSession.ts` com todos os 6 hooks implementados

### UI — funcionando ✅
- `src/components/dashboard/CaixaTab.tsx` com 447 linhas — fluxo completo
- `src/pages/DashboardPage.tsx` com aba "Caixa" na seção Operações

### Único ajuste necessário
No `src/pages/AdminPage.tsx`, linha 100-104:

```typescript
// ANTES
{
  icon: <DollarSign className="w-5 h-5" />,
  title: "Controle de Caixa",
  description: "Abertura e fechamento de caixa com saldo inicial, sangrias e relatório do turno.",
  status: "soon",  // ← mudar para "available"
},

// DEPOIS
{
  icon: <DollarSign className="w-5 h-5" />,
  title: "Controle de Caixa",
  description: "Abertura e fechamento de caixa com saldo inicial, sangrias e relatório do turno.",
  status: "available",
  actionLabel: "Ver no dashboard",
  actionHref: "/dashboard",
},
```

---

## Correção adicional — aviso de console

O `Metric` component no `AdminPage.tsx` está recebendo ref indevidamente por estar dentro de um `<div>` com ref implícito. A correção é garantir que o `Metric` não use ref. Isso é apenas um React warning de desenvolvimento, não afeta produção, mas será corrigido.

---

## Arquivo a modificar

| Arquivo | Mudança |
|---|---|
| `src/pages/AdminPage.tsx` | Status `"soon"` → `"available"` + `actionLabel` + `actionHref` no card de Controle de Caixa |

---

## Resultado esperado

O card do **Controle de Caixa** passará a exibir:
- Badge verde **"Disponível"** (igual ao Suporte via WhatsApp)
- Link clicável **"Ver no dashboard →"** que leva o usuário direto ao `/dashboard`
