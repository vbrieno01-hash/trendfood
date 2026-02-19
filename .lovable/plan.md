

# Limitar funcionalidades por plano de assinatura

## Resumo

Criar um sistema de permissoes baseado no `subscription_status` da organizacao (`trial`, `active`, `inactive`) combinado com um novo campo `subscription_plan` (`free`, `pro`, `enterprise`) para controlar o acesso a funcionalidades no dashboard.

## Limitacoes por plano

| Funcionalidade | Gratis | Pro / Trial | Enterprise |
|---|---|---|---|
| Cardapio (itens) | Max 20 | Ilimitado | Ilimitado |
| Mesas/QR Codes | Max 1 | Ilimitado | Ilimitado |
| Painel Cozinha (KDS) | Bloqueado | Liberado | Liberado |
| Controle de Caixa | Bloqueado | Liberado | Liberado |
| Cupons de desconto | Bloqueado | Liberado | Liberado |
| Mais Vendidos | Bloqueado | Liberado | Liberado |
| Painel do Garcom | Bloqueado | Liberado | Liberado |
| Historico de pedidos | Ultimos 7 dias | Ilimitado | Ilimitado |
| Multiplas unidades | Bloqueado | Bloqueado | Liberado |

## Mudancas no banco de dados

Adicionar coluna `subscription_plan` na tabela `organizations`:

```sql
ALTER TABLE organizations
ADD COLUMN subscription_plan text NOT NULL DEFAULT 'free';
```

Valores possiveis: `free`, `pro`, `enterprise`. Organizacoes existentes (em trial) serao tratadas como `pro` temporariamente.

## Arquivos a criar

| Arquivo | Descricao |
|---|---|
| `src/hooks/usePlanLimits.ts` | Hook central que retorna as permissoes e limites baseados no plano. Exporta funcoes como `canAccessFeature()`, `getMenuItemLimit()`, `getTableLimit()`, etc. |
| `src/components/dashboard/UpgradePrompt.tsx` | Componente reutilizavel que mostra um card de bloqueio com botao "Fazer upgrade" apontando para `/planos`. Usado nas tabs bloqueadas. |

## Arquivos a modificar

| Arquivo | Mudanca |
|---|---|
| `src/hooks/useAuth.tsx` | Adicionar `subscription_plan` na interface `Organization` |
| `src/pages/DashboardPage.tsx` | Importar `usePlanLimits`. Nas tabs bloqueadas (KDS, Caixa, Cupons, etc), mostrar `UpgradePrompt` ao inves do conteudo. Adicionar icone de cadeado nos itens de nav bloqueados. |
| `src/components/dashboard/MenuTab.tsx` | Verificar limite de itens no plano. Desabilitar botao "Novo item" e mostrar aviso quando atingir o limite (20 no plano Gratis). |
| `src/components/dashboard/TablesTab.tsx` | Verificar limite de mesas. No plano Gratis, permitir apenas 1 mesa. |
| `src/components/dashboard/HistoryTab.tsx` | No plano Gratis, filtrar apenas pedidos dos ultimos 7 dias e mostrar aviso. |

## Detalhes tecnicos

### Hook `usePlanLimits`

```text
Recebe: organization (com subscription_plan e subscription_status)
Retorna:
  - plan: 'free' | 'pro' | 'enterprise'
  - effectivePlan: plano efetivo (trial conta como 'pro')
  - menuItemLimit: number | null (null = ilimitado)
  - tableLimit: number | null
  - canAccess(feature): boolean
  - features: { kds, caixa, cupons, bestsellers, waiter, history_full, multi_unit }
```

A logica: se `subscription_status === 'trial'`, o plano efetivo e `pro` (trial tem acesso a tudo do Pro). Se `subscription_status === 'active'`, usa o `subscription_plan` real. Se `free`, aplica restricoes.

### Componente `UpgradePrompt`

Card com icone de cadeado, titulo da funcionalidade, descricao do que esta bloqueado, e botao "Fazer upgrade" que leva para `/planos`. Estilo consistente com o design existente (bordas, cores, rounded-xl).

### Fluxo na sidebar

Itens de navegacao bloqueados terao um pequeno icone de cadeado ao lado do label. Ao clicar, a tab abre mas mostra o `UpgradePrompt` no lugar do conteudo real.

### Limite de itens no cardapio

No `MenuTab`, antes de abrir o modal de criacao, verificar `items.length >= menuItemLimit`. Se atingido, mostrar toast de aviso e nao abrir o modal. Tambem mostrar um badge "20/20" no header indicando o uso.

