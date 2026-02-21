
# Corrigir frete "A combinar" ao digitar número da casa

## Problema

Quando o cliente preenche o número da casa no checkout, o endereço enviado ao geocoder (Nominatim) inclui o número, por exemplo:
`"12345-678, 123, Cidade, Estado, Brasil"`

O Nominatim frequentemente não consegue resolver endereços com números residenciais no meio da query, especialmente quando o CEP não está indexado. Isso causa falha na geocodificação e o frete exibe "A combinar".

Sem o número, a query fica `"12345-678, Cidade, Estado, Brasil"` e funciona normalmente.

## Causa raiz

No arquivo `src/pages/UnitPage.tsx`, linha 85-87, o `fullCustomerAddress` (usado para geocodificação) inclui `customerAddress.number`:

```text
[customerAddress.cep, customerAddress.number, customerAddress.city, customerAddress.state, "Brasil"]
```

## Solucao

Remover `customerAddress.number` da construcao do `fullCustomerAddress` usado para geocodificacao. A precisao a nivel de CEP/rua e mais que suficiente para calcular a faixa de distancia do frete.

### Arquivo: `src/pages/UnitPage.tsx`

Alterar a construcao do `fullCustomerAddress` (linhas 85-89) para nao incluir o numero da casa em nenhum dos dois caminhos (com CEP ou sem CEP):

**De:**
```text
const fullCustomerAddress = customerAddress.cep && customerAddress.city
    ? [customerAddress.cep, customerAddress.number, customerAddress.city, customerAddress.state, "Brasil"]
        .filter(Boolean).join(", ")
    : [customerAddress.street, customerAddress.number, customerAddress.neighborhood, ...]
```

**Para:**
```text
const fullCustomerAddress = customerAddress.cep && customerAddress.city
    ? [customerAddress.cep, customerAddress.city, customerAddress.state, "Brasil"]
        .filter(Boolean).join(", ")
    : [customerAddress.street, customerAddress.neighborhood, customerAddress.city, customerAddress.state, "Brasil"]
        .map((p) => p.trim()).filter(Boolean).join(", ");
```

O numero continua sendo usado normalmente no `fullCustomerAddressDisplay` (linha 77-80) para exibicao no WhatsApp, pedido e comprovante — apenas a query de geocodificacao muda.

## Impacto

- Nenhuma mudanca no banco de dados
- Nenhuma mudanca visual para o cliente
- O endereco completo (com numero e complemento) continua sendo enviado no pedido, WhatsApp e impressao
- Apenas a query interna de geocodificacao fica mais limpa e confiavel
