

# Atualizar Access Token de Sandbox do Mercado Pago

## O que será feito
Atualizar o secret `MERCADO_PAGO_ACCESS_TOKEN` com o valor de teste fornecido (`TEST-3776...`).

Ambas as credenciais ficarão alinhadas no ambiente Sandbox:
- **Public Key**: `TEST-774a082e-...` (já configurada)
- **Access Token**: `TEST-3776833830...` (será atualizada agora)

## Resultado esperado
Após a atualização, o erro "Card token service not found" será resolvido e o fluxo completo funcionará:
1. Frontend tokeniza o cartão com a Public Key de teste
2. Backend cria a assinatura/pagamento com o Access Token de teste
3. Pagamento aprovado → trigger baixa estoque → pedido aparece no KDS

## Arquivos alterados
Nenhum arquivo de código será alterado. Apenas o secret `MERCADO_PAGO_ACCESS_TOKEN` será atualizado no backend.

