

## Plano: Blindar Segurança do Sistema (sem mexer em codigo)

### Os 3 problemas encontrados

| # | Gravidade | Problema | Risco Real |
|---|-----------|----------|------------|
| 1 | **CRITICO** | Dados de clientes (nome, telefone, endereço) ficam expostos publicamente na tabela `orders` | Qualquer pessoa pode ler TODOS os pedidos com dados pessoais dos clientes |
| 2 | **MEDIO** | Qualquer pessoa pode inserir itens em qualquer pedido (`order_items`) | Alguem mal-intencionado pode adicionar itens caros em pedidos existentes |
| 3 | **BAIXO** | 14 tabelas com INSERT aberto (`WITH CHECK (true)`) | Necessario para o fluxo de pedidos sem login, mas algumas tabelas nao precisam disso |

### O que sera corrigido (somente migracao SQL, zero mudanca em codigo)

**1. Proteger leitura dos pedidos (o mais critico)**
- Trocar a policy `orders_select_public` de `USING (true)` para permitir leitura publica apenas dos pedidos do DIA ATUAL (ultimas 24h)
- Pedidos antigos so ficam visiveis para o dono da loja (autenticado)
- Isso protege historico de clientes sem quebrar a cozinha, garcom ou checkout

**2. Restringir INSERT em order_items**
- Trocar `WITH CHECK (true)` por uma validacao que o `order_id` referenciado deve existir e ter status `pending`
- Impede que alguem adicione itens em pedidos ja finalizados

**3. Restringir INSERT em tabelas sensıveis**
- `loyalty_points` e `loyalty_redemptions`: restringir para que o `organization_id` referenciado exista
- `couriers` e `courier_shifts`: restringir para orgs existentes
- Manter INSERT aberto em `orders`, `reviews`, `suggestions` (necessario para clientes sem login)

### O que NAO sera mexido (para nao quebrar nada)
- Nenhum arquivo `.tsx` ou `.ts` sera alterado
- INSERT publico em `orders` continua aberto (clientes precisam fazer pedidos)
- SELECT publico em `menu_items`, `organizations`, `tables` continua aberto (pagina publica da loja)
- Policies de UPDATE/DELETE do owner e admin permanecem intactas

### Resultado
- 1 migracao SQL com DROP/CREATE de policies
- Dados pessoais de clientes protegidos
- Zero impacto no fluxo de pedidos, cozinha ou garcom

