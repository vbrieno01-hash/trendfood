
# Campos Estruturados de Endereço do Cliente no Checkout

## Problema atual

O campo de endereço do cliente no checkout é um único texto livre ("Rua, número, complemento, bairro"), sem cidade nem estado. O geocoder (Nominatim) não consegue localizar o endereço com precisão, resultando em "A combinar via WhatsApp" em vez de calcular o frete automaticamente.

## Solução

Substituir os dois campos de texto livre (endereço + confirmação) por um formulário estruturado com **preenchimento automático via CEP** — igual ao que foi feito para o endereço da loja no painel.

### Campos do cliente

| Campo | Obrigatório | Preenchimento |
|---|---|---|
| CEP | Sim | Manual |
| Logradouro | Sim | Auto (ViaCEP) |
| Número | Sim | Manual |
| Complemento | Não | Manual |
| Bairro | Não | Auto (ViaCEP) |
| Cidade | Sim | Auto (ViaCEP) |
| Estado | Sim | Auto (ViaCEP) |

Ao digitar o CEP e sair do campo, o sistema consulta a API do **ViaCEP** (gratuita, sem chave) e preenche logradouro, bairro, cidade e estado automaticamente. O cliente só precisa digitar o número.

### Endereço montado automaticamente

```
Rua das Flores, 42, Apto 3, Centro, Cubatão, SP, Brasil
```

Este formato é diretamente compatível com o `useDeliveryFee` existente — o hook recebe a string já completa com cidade e estado, o que garante que o Nominatim encontre o endereço e calcule o frete corretamente.

## Fluxo do usuário

1. Cliente seleciona **Entrega**
2. Campos estruturados aparecem no lugar do texto livre
3. Cliente digita o CEP (ex: `11510-020`) e pressiona Tab/sai do campo
4. Sistema busca ViaCEP → preenche rua, bairro, cidade, estado automaticamente
5. Cliente digita o número (e complemento se quiser)
6. Frete é calculado automaticamente em tempo real
7. Total correto aparece antes de enviar o pedido

## O que muda visualmente

**Antes:**
```
[ Rua, número, complemento, bairro           ]
[ Digite novamente para confirmar            ]
🛵 Frete    A combinar via WhatsApp
```

**Depois:**
```
CEP *
[ 11510-020 ]  [ Buscando... ]

Logradouro *                   Número *
[ Rua das Flores           ]   [ 42  ]

Complemento (opcional)
[ Apto 3                                     ]

Bairro                         Cidade *
[ Centro              ]        [ Cubatão     ]

Estado *
[ SP ▾ ]

🛵 Frete (1.8 km)    R$ 5,00   ← calculado automaticamente!
```

O campo "Confirme o Endereço" (que era para segurança contra erros de digitação) é removido, pois os campos estruturados já eliminam a ambiguidade — o cliente não pode "errar" o nome da cidade pois é preenchido automaticamente.

## Arquivos afetados

Somente `src/pages/UnitPage.tsx`:

1. **Novos estados**: Substituir `address` e `addressConfirm` por um objeto `customerAddress` com os subcampos (`cep`, `street`, `number`, `complement`, `neighborhood`, `city`, `state`)
2. **Função `fetchCustomerCep`**: Consulta ViaCEP e preenche os campos automaticamente
3. **Função `buildCustomerAddress`**: Monta a string completa passada ao `useDeliveryFee` e ao WhatsApp
4. **UI do checkout**: Substituir os inputs de texto livre pelos campos estruturados em grid (dentro do bloco `orderType === "Entrega"`)
5. **Validação**: Checar que CEP, logradouro, número, cidade e estado estão preenchidos antes de enviar
6. **Reset**: Limpar o objeto `customerAddress` junto com os outros campos no reset pós-envio

## Nenhuma mudança no backend nem no hook

O `useDeliveryFee` continua recebendo a string de endereço — apenas a qualidade da string melhora (agora inclui cidade, estado e país). Nenhuma migração de banco necessária.
