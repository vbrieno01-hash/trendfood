

## Checklist de Auditoria do TrendFood — Erros Encontrados

Após varredura completa no código, encontrei os seguintes problemas:

---

### BUG CRÍTICO

**1. Edge function inexistente sendo chamada**
- `DashboardPage.tsx` linha 494 chama `supabase.functions.invoke("check-subscription")` — essa função **não existe** em `supabase/functions/`. Existe `check-subscription-pix`, mas não `check-subscription`. Isso gera erro silencioso no checkout por cartão (pós-checkout feedback).
- **Correção:** Remover essa chamada ou substituir por lógica correta (já que o webhook `mp-webhook` cuida da ativação).

---

### BUGS MODERADOS

**2. WhatsApp placeholder genérico (5511999999999)**
- Três lugares usam um número fake de WhatsApp:
  - `DashboardPage.tsx` (tela de assinatura inativa, linha 621)
  - `AdminPage.tsx` (link de suporte, linha 188)
  - `DocsTerminalPage.tsx` (ajuda impressora, linha 624)
- **Correção:** Substituir pelo número real de suporte do TrendFood.

**3. `terms_acceptances` forçando `as any`**
- `CardPaymentForm.tsx` e `PixPaymentTab.tsx` usam `supabase.from("terms_acceptances" as any)` — indica que a tabela não está no types.ts gerado. Funciona em runtime mas sem type-safety.
- **Correção:** A tabela existe no banco. Basta garantir que o types.ts está atualizado (acontece automaticamente).

**4. `DeleteUnitDialog.tsx` deleta `terms_acceptances` sem `as any`**
- Linha 76 — pode falhar com erro de tipo se types.ts não incluir a tabela. Inconsistência com os outros usos.

---

### AVISOS MENORES

**5. `useMemo` com dependência imprecisa**
- `DashboardPage.tsx` linha 518: `lockedFeatures` usa `[planLimits.effectivePlan]` como dep, mas `canAccess` é o que realmente importa. Funciona porque `canAccess` deriva de `effectivePlan`, mas é frágil.

**6. `useEffect` sem deps completas**
- `SubscriptionTab.tsx` linha 114: `useEffect` com `[]` que usa `searchParams` e `setSearchParams` — React eslint avisaria, mas funciona na prática.

**7. Sidebar "Ganhe Desconto" não usa `handleTabChange`**
- Linha 816: `setActiveTab("referral")` direto, sem atualizar a URL. Se o usuário recarregar a página nessa aba, a URL não reflete a aba correta.

---

### RESUMO VISUAL

```text
┌──────────────────────────────────────┬──────────┐
│ Problema                             │ Risco    │
├──────────────────────────────────────┼──────────┤
│ Edge function "check-subscription"   │ CRÍTICO  │
│ WhatsApp 5511999999999 placeholder   │ MODERADO │
│ terms_acceptances "as any"           │ BAIXO    │
│ Sidebar referral sem URL sync        │ BAIXO    │
│ useMemo dep imprecisa                │ MÍNIMO   │
│ useEffect deps incompletas           │ MÍNIMO   │
└──────────────────────────────────────┴──────────┘
```

### Plano de Correção

**Arquivo 1: `src/pages/DashboardPage.tsx`**
- Remover bloco de checkout feedback que chama `check-subscription` (linhas 488-504) — o webhook já cuida disso
- Linha 816: trocar `setActiveTab("referral")` por `handleTabChange("referral")`
- Linha 621: substituir `5511999999999` pelo número real

**Arquivo 2: `src/pages/AdminPage.tsx`**
- Linha 188: substituir `5511999999999` pelo número real

**Arquivo 3: `src/pages/DocsTerminalPage.tsx`**
- Linha 624: substituir `5511999999999` pelo número real

Preciso saber o **número real de WhatsApp do suporte TrendFood** para fazer a substituição.

