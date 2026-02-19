

# Limitar funcionalidades por plano de assinatura

## Resumo

Adicionar a coluna `subscription_plan` no banco de dados e implementar toda a logica de restricao de funcionalidades no frontend, incluindo o hook `usePlanLimits`, o componente `UpgradePrompt`, e as verificacoes em cada tab do dashboard.

## 1. Migracao no banco de dados

Adicionar coluna `subscription_plan` na tabela `organizations`:

```sql
ALTER TABLE organizations
ADD COLUMN subscription_plan text NOT NULL DEFAULT 'free';
```

Organizacoes existentes em trial continuarao funcionando como `pro` pela logica do hook (nao pelo valor da coluna).

## 2. Arquivos a criar

### `src/hooks/usePlanLimits.ts`

Hook central que recebe a organization e retorna:

```text
- plan: 'free' | 'pro' | 'enterprise'
- effectivePlan: plano efetivo (trial = pro)
- menuItemLimit: 20 | null
- tableLimit: 1 | null
- canAccess(feature): boolean
- features: { kds, caixa, cupons, bestsellers, waiter, history_full, multi_unit }
```

Logica principal:
- Se `subscription_status === 'trial'` -> plano efetivo = `pro`
- Se `subscription_status === 'active'` -> usa `subscription_plan` real
- Se `subscription_status === 'inactive'` -> tudo bloqueado (ja tratado pelo paywall existente)
- Plano `free` aplica todas as restricoes da tabela

### `src/components/dashboard/UpgradePrompt.tsx`

Componente reutilizavel com:
- Icone de cadeado
- Titulo da funcionalidade bloqueada
- Descricao curta
- Botao "Fazer upgrade" que leva para `/planos`
- Design consistente com o padrao existente (card, rounded-xl, bordas)

## 3. Arquivos a modificar

### `src/hooks/useAuth.tsx`

Adicionar `subscription_plan` na interface `Organization` (linha 14, junto com os outros campos).

### `src/hooks/useOrganization.ts`

Adicionar `subscription_plan` na interface `Organization` exportada.

### `src/pages/DashboardPage.tsx`

Mudancas:
- Importar `usePlanLimits` e `UpgradePrompt`
- Importar icone `Lock` do lucide-react
- Chamar `usePlanLimits(organization)` no componente
- Nos arrays `navItemsTop` e `navItemsOps`, adicionar icone de cadeado ao lado do label quando a feature estiver bloqueada
- Nas tabs bloqueadas (kitchen, waiter, caixa, coupons, bestsellers), renderizar `UpgradePrompt` ao inves do conteudo real
- No HistoryTab, passar prop `restrictTo7Days` quando plano free

### `src/components/dashboard/MenuTab.tsx`

Mudancas:
- Receber `menuItemLimit` como prop opcional
- No header, mostrar badge "X/20" quando houver limite
- Na funcao `openCreate`, verificar se `items.length >= menuItemLimit` e mostrar toast de aviso ao inves de abrir o modal
- Desabilitar botao "Novo item" visualmente quando limite atingido

### `src/components/dashboard/TablesTab.tsx`

Mudancas:
- Receber `tableLimit` como prop opcional
- No botao "Nova Mesa", verificar se `tables.length >= tableLimit`
- Mostrar toast de aviso e desabilitar o botao quando limite atingido
- Mostrar badge "1/1" no header quando houver limite

### `src/components/dashboard/HistoryTab.tsx`

Mudancas:
- Receber prop `restrictTo7Days` opcional
- Quando `restrictTo7Days === true`:
  - Remover opcoes "30 dias" e "Tudo" do filtro de periodo
  - Mostrar banner informativo no topo dizendo que no plano Gratis so mostra 7 dias
  - Forcar periodo maximo em "7d"

## 4. Fluxo visual

```text
Usuario no plano Gratis clica em "Cozinha (KDS)" na sidebar:
  -> Sidebar mostra icone de cadeado ao lado do texto
  -> Area de conteudo mostra UpgradePrompt com:
     - Icone de cadeado grande
     - "Painel da Cozinha"
     - "Gerencie pedidos em tempo real com o KDS. Disponivel nos planos Pro e Enterprise."
     - Botao [Fazer upgrade] -> /planos

Usuario no plano Gratis tenta criar 21o item no cardapio:
  -> Botao "Novo item" aparece desabilitado
  -> Badge "20/20" no header
  -> Toast: "Limite de itens atingido. Faca upgrade para adicionar mais."

Usuario em Trial:
  -> Tudo liberado (mesmo comportamento do Pro)
  -> Banner de trial continua aparecendo normalmente
```

## 5. Resumo das mudancas

| Tipo | Arquivo | Acao |
|---|---|---|
| BD | organizations | ADD COLUMN subscription_plan |
| Novo | src/hooks/usePlanLimits.ts | Hook de permissoes |
| Novo | src/components/dashboard/UpgradePrompt.tsx | Card de bloqueio |
| Editar | src/hooks/useAuth.tsx | Adicionar campo na interface |
| Editar | src/hooks/useOrganization.ts | Adicionar campo na interface |
| Editar | src/pages/DashboardPage.tsx | Logica de bloqueio + cadeados na nav |
| Editar | src/components/dashboard/MenuTab.tsx | Limite de 20 itens |
| Editar | src/components/dashboard/TablesTab.tsx | Limite de 1 mesa |
| Editar | src/components/dashboard/HistoryTab.tsx | Restricao de 7 dias |

