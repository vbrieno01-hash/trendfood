
# Campos Estruturados de Endereço da Loja (CEP, Rua, Número, etc.)

## Problema atual

O campo "Endereço da loja" é um único texto livre (`store_address`), o que faz com que os lojistas escrevam endereços incompletos como `"rua Jaime João olcese"` — sem número, cidade ou estado. Isso sabota o geocoding e impede o cálculo automático do frete.

## Solução

Substituir o campo de texto livre por **campos separados e guiados**:

| Campo | Placeholder | Obrigatório |
|---|---|---|
| CEP | 00000-000 | Sim |
| Logradouro | Rua, Av., etc. | Sim |
| Número | 123 | Sim |
| Complemento | Apto, Sala... | Não |
| Bairro | Centro | Não |
| Cidade | Cubatão | Sim |
| Estado | SP | Sim (select) |

Ao salvar, os campos são **concatenados automaticamente** numa string formatada que já alimenta o geocoding da forma correta:

```
Rua Jaime João Olcese, 123, Centro, Cubatão, SP, Brasil
```

Isso elimina a ambiguidade do Nominatim e garante que o frete seja calculado corretamente.

### Bônus: preenchimento automático via CEP

Ao digitar o CEP e sair do campo (blur), o sistema consulta a API pública do ViaCEP (gratuita, sem chave) e preenche automaticamente logradouro, bairro e cidade. O lojista só precisa adicionar o número.

```
CEP: 11510-020  →  busca ViaCEP
                →  Logradouro: "Rua Jaime João Olcese"
                →  Bairro: "Centro"
                →  Cidade: "Cubatão"
                →  Estado: "SP"
```

## Arquivos afetados

Somente `src/components/dashboard/StoreProfileTab.tsx`:

1. Adicionar estado `addressFields` com os subcampos (cep, street, number, complement, neighborhood, city, state)
2. Inicializar o estado fazendo parse do `store_address` existente ou deixando vazio
3. Adicionar função `fetchCep(cep)` que chama `https://viacep.com.br/ws/{cep}/json/`
4. Adicionar função `buildStoreAddress(fields)` que monta a string final para salvar no banco
5. Substituir o `<Input id="store-address" ... />` pelos campos estruturados em grid
6. No `handleSave`, usar `buildStoreAddress(addressFields)` em vez de `form.store_address`

## Como ficará visualmente

```
┌─────────────────────────────────────────────────────┐
│ CEP *                                                │
│ [  00000-000  ]  [Buscando... / Buscar]             │
│                                                      │
│ Logradouro *              Número *                   │
│ [ Rua Jaime João Olcese ] [ 123  ]                  │
│                                                      │
│ Complemento (opcional)                               │
│ [ Apto 4B                                     ]     │
│                                                      │
│ Bairro                    Cidade *                   │
│ [ Centro          ]       [ Cubatão          ]       │
│                                                      │
│ Estado *                                             │
│ [ SP ▾ ]                                            │
└─────────────────────────────────────────────────────┘
```

O endereço final salvo no banco (ex: `"Rua Jaime João Olcese, 123, Centro, Cubatão, SP, Brasil"`) é completamente compatível com o `useDeliveryFee` existente — nenhuma mudança necessária no hook.

## Nenhuma migração de banco necessária

O campo `store_address` já existe como `text` na tabela `organizations`. O formato da string apenas melhora — o hook de geocoding continua consumindo do mesmo jeito.
