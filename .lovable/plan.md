
# Logistica de Motoboys

## Resumo
Criar um sistema completo de entregas por motoboy integrado ao fluxo de pedidos existente. Inclui cadastro do motoboy, painel de entregas disponiveis, aceite de corrida com calculo de valor automatico, e rastreamento de status.

## Como vai funcionar

### Fluxo do Motoboy
1. O motoboy acessa `/motoboy` no navegador
2. Na primeira vez, preenche um cadastro simples (nome, placa, telefone) vinculado a uma loja via slug
3. Apos cadastro, ve uma lista de pedidos com status "ready" (prontos) da loja vinculada
4. Cada pedido mostra: numero da mesa/pedido, endereco de entrega, distancia estimada e **valor da corrida**
5. O motoboy clica em "Aceitar Entrega" e o pedido muda para "em rota"
6. Ao finalizar, marca como "Entregue"

### Fluxo da Loja
1. Quando a cozinha marca um pedido como "Pronto" (ready), ele aparece automaticamente no painel do motoboy via Realtime
2. O dono da loja pode ver no dashboard qual motoboy aceitou cada entrega e o status

### Calculo do Valor da Corrida
- **API usada**: Nominatim (geocodificacao) + OSRM (distancia por rota) -- as mesmas ja utilizadas no calculo de frete
- **Formula**: Taxa Base R$ 3,00 + (distancia em km x R$ 2,50)
- Exemplo: entrega a 4km = R$ 3,00 + (4 x R$ 2,50) = R$ 13,00
- O valor e exibido ao motoboy antes de aceitar

## Mudancas no Banco de Dados

### Nova tabela: `couriers`
Armazena os motoboys cadastrados.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | Identificador |
| organization_id | uuid (FK) | Loja vinculada |
| name | text | Nome do motoboy |
| phone | text | Telefone |
| plate | text | Placa da moto |
| active | boolean | Se esta ativo (default true) |
| created_at | timestamptz | Data de cadastro |

RLS: SELECT publico (a loja precisa ver), INSERT publico (cadastro sem login), UPDATE/DELETE somente pelo dono da organizacao.

### Nova tabela: `deliveries`
Registra cada entrega vinculada a um pedido.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | Identificador |
| order_id | uuid (FK -> orders) | Pedido vinculado |
| organization_id | uuid | Loja |
| courier_id | uuid (FK -> couriers, nullable) | Motoboy que aceitou |
| customer_address | text | Endereco do cliente |
| distance_km | numeric | Distancia calculada |
| fee | numeric | Valor da corrida |
| status | text | pendente, em_rota, entregue |
| created_at | timestamptz | Data de criacao |
| accepted_at | timestamptz (nullable) | Quando o motoboy aceitou |
| delivered_at | timestamptz (nullable) | Quando foi entregue |

RLS: SELECT publico (motoboys e loja precisam ver), INSERT pelo dono da org, UPDATE publico com restricoes (motoboy pode aceitar/finalizar).

Realtime habilitado em `deliveries` para atualizacao instantanea no painel do motoboy.

## Arquivos a criar

### 1. `src/pages/CourierPage.tsx`
Pagina principal do motoboy (`/motoboy?org=SLUG`):
- Se nao tem cadastro no localStorage, mostra formulario de registro (nome, placa, telefone)
- Apos registro, mostra lista de entregas disponiveis (status = "pendente")
- Cada card mostra: numero do pedido, endereco, distancia, valor estimado (R$ 3 + km x R$ 2.50)
- Botao "Aceitar Entrega" atualiza status para "em_rota" e vincula courier_id
- Aba "Minhas Entregas" mostra as em andamento com botao "Marcar como Entregue"

### 2. `src/hooks/useCourier.ts`
- `useRegisterCourier`: mutation para cadastrar motoboy
- `useAvailableDeliveries`: query com realtime para entregas pendentes da org
- `useAcceptDelivery`: mutation para aceitar entrega
- `useCompleteDelivery`: mutation para marcar como entregue
- `useMyCourier`: busca dados do motoboy pelo ID salvo no localStorage

### 3. `src/hooks/useDeliveryDistance.ts`
Reutiliza as funcoes de geocodificacao e rota do `useDeliveryFee.ts`:
- Recebe endereco da loja e endereco do cliente
- Retorna distancia em km e valor calculado (R$ 3 + km x R$ 2.50)

## Arquivos a modificar

### 4. `src/App.tsx`
- Adicionar rota `/motoboy` apontando para `CourierPage`

### 5. `src/pages/DashboardPage.tsx`
- Adicionar link "Motoboys" na sidebar com icone `Bike`
- Criar aba no dashboard para o dono ver entregas em andamento e motoboys cadastrados

### 6. `src/components/dashboard/StoreProfileTab.tsx` (opcional)
- Adicionar secao para configurar taxa base e valor por km (default R$ 3 e R$ 2.50)

## Migracao SQL (resumo)

```text
1. CREATE TABLE couriers (id, organization_id, name, phone, plate, active, created_at)
2. CREATE TABLE deliveries (id, order_id, organization_id, courier_id, customer_address, distance_km, fee, status, created_at, accepted_at, delivered_at)
3. RLS policies para ambas as tabelas
4. ALTER PUBLICATION supabase_realtime ADD TABLE deliveries
```

## Consideracoes

- **Sem Google Maps**: o projeto usa Nominatim + OSRM (gratuitos, sem API key). O calculo de distancia sera feito com essas mesmas APIs
- **Sem autenticacao para motoboy**: o cadastro e simples (nome/placa/telefone), sem criar conta. O ID do motoboy fica salvo no localStorage do dispositivo dele
- **Seguranca**: o motoboy so pode alterar entregas (aceitar/finalizar), nao pode modificar pedidos ou dados da loja
