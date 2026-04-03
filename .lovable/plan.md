

## Plano: Programa de Fidelidade baseado em Telefone

### Visão geral
Cliente acumula pontos automaticamente a cada pedido com base no valor gasto. Identificação pelo telefone (já obrigatório no checkout). O lojista configura as regras (valor por ponto, pontos para resgate, desconto) e visualiza os clientes fidelizados no dashboard.

### Regras padrão
- A cada R$50 gastos → 1 ponto
- 10 pontos → desconto configurável (ex: R$20 ou 10%)
- Baseado no telefone do cliente (normalizado, só dígitos)

### Banco de dados

**Tabela `loyalty_config`** — configuração por loja
| Coluna | Tipo | Default |
|--------|------|---------|
| id | uuid | gen_random_uuid() |
| organization_id | uuid | NOT NULL, UNIQUE |
| enabled | boolean | false |
| spend_per_point | numeric | 50 |
| points_to_redeem | integer | 10 |
| reward_type | text | 'fixed' |
| reward_value | numeric | 20 |
| created_at | timestamptz | now() |

RLS: SELECT público, INSERT/UPDATE/DELETE pelo owner + admin.

**Tabela `loyalty_points`** — saldo por cliente (telefone)
| Coluna | Tipo | Default |
|--------|------|---------|
| id | uuid | gen_random_uuid() |
| organization_id | uuid | NOT NULL |
| phone | text | NOT NULL |
| points | integer | 0 |
| total_spent | numeric | 0 |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now() |

UNIQUE(organization_id, phone). RLS: SELECT público, INSERT/UPDATE público (acúmulo automático), DELETE owner+admin.

**Tabela `loyalty_redemptions`** — histórico de resgates
| Coluna | Tipo | Default |
|--------|------|---------|
| id | uuid | gen_random_uuid() |
| organization_id | uuid | NOT NULL |
| phone | text | NOT NULL |
| points_used | integer | NOT NULL |
| discount_value | numeric | NOT NULL |
| order_id | uuid | NULL |
| created_at | timestamptz | now() |

RLS: SELECT owner+admin, INSERT público, DELETE owner+admin.

### Fluxo do cliente (UnitPage)

1. Após preencher o telefone no checkout, o sistema busca automaticamente os pontos do cliente na `loyalty_points`
2. Exibe um badge discreto: "🎁 Você tem X pontos!" 
3. Se pontos >= `points_to_redeem`, mostra botão "Usar pontos (desconto de R$XX)"
4. Ao usar, cria registro em `loyalty_redemptions`, subtrai pontos, e aplica desconto no pedido
5. Após pedido confirmado, acumula pontos baseado no valor gasto (função no código, não trigger)

### Dashboard do lojista

**Nova aba "Fidelidade"** no grupo OPERACIONAL (após Avaliações):
- Toggle para ativar/desativar o programa
- Configuração: valor por ponto, pontos para resgate, tipo e valor do desconto
- Lista de clientes com pontos acumulados (telefone parcialmente mascarado, pontos, total gasto)
- Histórico de resgates

### Arquivos novos e modificados

| Arquivo | Ação |
|---------|------|
| Migração SQL | Criar tabelas `loyalty_config`, `loyalty_points`, `loyalty_redemptions` com RLS |
| `src/hooks/useLoyalty.ts` | Hook para buscar config, pontos do cliente, acumular e resgatar |
| `src/components/dashboard/LoyaltyTab.tsx` | Aba de configuração e gestão no dashboard |
| `src/pages/DashboardPage.tsx` | Adicionar aba "Fidelidade" no grupo operacional + TabKey |
| `src/pages/UnitPage.tsx` | Buscar pontos pelo telefone, exibir badge, permitir resgate, acumular após pedido |

### Detalhes técnicos
- O telefone é normalizado (só dígitos) antes de qualquer operação para evitar duplicatas
- O acúmulo de pontos acontece no momento do `placeOrder` (client-side), não via trigger, para simplicidade
- O desconto do resgate é aplicado como desconto no total antes do frete, similar ao cupom
- A config é carregada via query simples com `maybeSingle()` no orgId

