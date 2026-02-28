

## Melhorar mensagem de rejeição por risco

Atualizar a mensagem do `cc_rejected_high_risk` em `src/components/checkout/mpErrorMessages.ts` para sugerir usar outro cartão ou PIX.

### Alteração

**`src/components/checkout/mpErrorMessages.ts`**:
- `cc_rejected_high_risk`: de "Pagamento recusado por medida de segurança" para "Pagamento recusado por medida de segurança. Tente outro cartão ou pague via PIX."

