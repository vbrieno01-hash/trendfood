
# Criacao automatica de entregas ao marcar "Pronto"

## Resumo
Quando a cozinha marcar um pedido de delivery (table_number = 0) como "Pronto", o sistema vai automaticamente criar um registro na tabela `deliveries` com o endereco do cliente (extraido das notas do pedido) e calcular a distancia/valor da corrida.

## Como vai funcionar

1. A cozinha clica em "Marcar como Pronto" em um pedido de entrega
2. O sistema detecta que e um pedido delivery (table_number === 0)
3. Extrai o endereco do campo `notes` do pedido (formato `END.:Rua X, 123, Cidade, Estado`)
4. Insere um registro na tabela `deliveries` com status "pendente"
5. O calculo de distancia e feito em background -- a entrega aparece imediatamente para o motoboy
6. O motoboy ve a entrega no painel `/motoboy` com o endereco e valor estimado

## Detalhes tecnicos

### Novo hook: `src/hooks/useCreateDelivery.ts`
- Funcao `parseAddressFromNotes(notes: string)`: extrai o endereco do campo notes usando regex para encontrar `END.:...`
- Hook `useCreateDeliveryOnReady()`: mutation que cria o registro na tabela deliveries
- Calcula distancia/fee usando as funcoes de geocodificacao ja existentes (Nominatim + OSRM)
- Se o calculo falhar, a entrega e criada mesmo assim com `distance_km = null` e `fee = null` (motoboy pode aceitar e combinar valor)

### Arquivos a modificar

1. **`src/components/dashboard/KitchenTab.tsx`** (painel KDS no dashboard)
   - No `handleUpdateStatus`, quando `status === "ready"` e `order.table_number === 0`:
     - Extrair endereco das notas
     - Chamar insert na tabela `deliveries`
     - Disparar calculo de distancia em background

2. **`src/pages/KitchenPage.tsx`** (tela fullscreen da cozinha)
   - Mesma logica do KitchenTab

### Logica de extracao do endereco
O campo `notes` armazena dados no formato pipe-separated:
```text
TIPO:Entrega|CLIENTE:Joao|TEL:11999|END.:Rua X, 123, Bairro, Cidade, SP, Brasil|FRETE:R$ 8,00|PGTO:PIX
```
A funcao extrai a parte apos `END.:` ate o proximo `|` ou fim da string.

### Protecao contra duplicatas
Antes de criar a entrega, verifica se ja existe um registro em `deliveries` para aquele `order_id`. Se existir, nao cria outro.

### Fluxo de fallback
- Se o endereco nao for encontrado nas notas, a entrega e criada com `customer_address = "Endereco nao informado"`
- Se o calculo de distancia falhar, `distance_km` e `fee` ficam como `null`
- Em ambos os casos a entrega aparece normalmente para o motoboy
