

## Reordenar campo Pgto para baixo de End.

A nova ordem dos campos do cliente na comanda sera:

1. Nome
2. CPF/CNPJ
3. Tel
4. End.
5. Pgto
6. Frete
7. Obs

### Arquivos a alterar

**1. `src/components/dashboard/ReceiptPreview.tsx`**
- Reordenar as linhas do bloco de dados do cliente para: Nome, CPF/CNPJ, Tel, End., Pgto, Frete, Obs

**2. `src/lib/printOrder.ts`**
- Reordenar o array `customerRows` para a mesma sequencia

**3. `src/lib/formatReceiptText.ts`**
- Reordenar o array `fields` para a mesma sequencia

Nenhuma logica sera alterada, apenas a ordem de exibicao.

