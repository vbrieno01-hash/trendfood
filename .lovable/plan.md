

## Diagnóstico

Analisei o código atual do `PlanCard.tsx` e a lógica **já está correta**:

```tsx
// Linha 105 atual:
{currentPlan && price === "Grátis" ? null : currentPlan ? (
  <Button disabled>Plano atual</Button>
) : ...}
```

Essa lógica faz exatamente o que você pediu:
- Quando `currentPlan === true` e `price === "Grátis"` → **nenhum botão** (null)
- Na landing page (Index.tsx), `currentPlan` não é passado → botão aparece normal

### Onde o PlanCard é usado:

| Local | `currentPlan` passado? | Resultado para Free |
|-------|----------------------|---------------------|
| **Landing page** (`Index.tsx`) | Não | Botão visível ("Ver detalhes") |
| **Página de preços** (`PricingPage.tsx`) | Sim (se logado) | Botão **escondido** |
| **Aba Assinatura** (`SubscriptionTab.tsx`) | Sim | Botão **escondido** |
| **Dialog Upgrade** (`UpgradeDialog.tsx`) | Sim | Botão **escondido** |

### Conclusão

A mudança já foi aplicada corretamente no último edit. O que você viu no screenshot pode ter sido o preview **antes do build completar**. Não há nenhuma alteração adicional necessária — o botão "Plano atual" do plano Grátis já está invisível para qualquer loja com conta criada.

Se ainda estiver aparecendo, recarregue a página do preview para forçar o novo build.

