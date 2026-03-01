

## Plano: Busca por CEP no Checkout

### Problema
O campo de endereço no checkout (`CheckoutPage.tsx`) é texto livre — o cliente pode errar ou não saber o endereço completo. A `UnitPage` já tem busca por CEP via `viacep-proxy`, mas o checkout não.

### Solução
Substituir o campo único de endereço por campos estruturados com busca automática por CEP, igual ao que já existe na `UnitPage`:

1. **Novo estado estruturado** no `CheckoutPage`: `{ cep, street, number, complement, neighborhood, city, state }` em vez de um único `address` string.

2. **Campo CEP com auto-preenchimento**: ao digitar 8 dígitos, chama `viacep-proxy` e preenche rua, bairro, cidade e estado automaticamente. O cliente só precisa digitar o número e complemento.

3. **Layout dos campos**:
   - CEP (com loading spinner e máscara `00000-000`)
   - Rua (preenchida automaticamente, editável)
   - Número + Complemento (lado a lado)
   - Bairro (preenchido automaticamente, editável)
   - Cidade + Estado (preenchidos, read-only ou editáveis)

4. **Montagem do endereço final**: ao confirmar, concatena os campos em uma string formatada igual à `UnitPage` (`Rua X, 123, Bairro, Cidade, Estado, CEP, Brasil`) para manter compatibilidade com o `onConfirm` e o cálculo de frete.

5. **Validação**: exigir CEP, rua, número, cidade e estado preenchidos antes de permitir o envio.

### Componentes afetados
- `src/components/checkout/CheckoutPage.tsx` — substituir campo livre por campos estruturados com busca CEP

### Referência
A lógica de `fetchCustomerCep` da `UnitPage.tsx` (linhas ~289-314) será replicada.

