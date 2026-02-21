

# Evolucao do Modulo de Motoboys e Entregas

## 1. Banco de Dados

### 1.1 Novo campo `whatsapp` na tabela `couriers`
- Adicionar coluna `whatsapp text` (nullable) na tabela `couriers`

### 1.2 Novo status `cancelada` nas entregas
- Nenhuma alteracao de schema necessaria -- o campo `status` ja e `text` livre. Basta usar o valor `"cancelada"` no codigo.

## 2. Dashboard do Lojista (`CourierDashboardTab.tsx`)

### 2.1 Filtro por data
- Adicionar um seletor de data (DatePicker usando Popover + Calendar) no topo
- Por padrao, filtrar entregas do dia atual (comparando `created_at` com a data selecionada)
- Adicionar botoes rapidos: "Hoje", "Ontem", "Semana", "Mes"
- Atualizar o hook `useOrgDeliveries` para aceitar um parametro de intervalo de datas e filtrar com `.gte()` / `.lt()` no Supabase

### 2.2 Excluir entrega e Limpar Historico
- Botao de lixeira em cada card de entrega (com confirmacao via AlertDialog)
- Botao "Limpar Historico" que deleta entregas com status `entregue` ou `cancelada` anteriores a data selecionada
- Criar hook `useDeleteDelivery` e `useClearDeliveryHistory` em `useCourier.ts`

### 2.3 Card "Resumo do Dia"
- Card que agrupa entregas do dia filtrado por motoboy
- Para cada motoboy: total de entregas, soma dos KM, soma das taxas (fee)
- Linha de total geral no final

### 2.4 Status Concluida/Cancelada nos cards
- Adicionar `cancelada` ao `statusMap` com cor vermelha
- Botoes de acao no card de entrega ativa: "Concluir" (muda para `entregue`) e "Cancelar" (muda para `cancelada`)
- Cards com fundo colorido sutil conforme status

### 2.5 WhatsApp no cadastro de motoboys
- Exibir campo WhatsApp na lista de motoboys cadastrados

### 2.6 Lucro liquido
- Buscar o valor total do pedido (soma de `order_items.price * quantity`) e exibir ao lado do fee do motoboy
- Mostrar: "Pedido: R$ X | Motoboy: R$ Y | Lucro: R$ Z"

## 3. Painel do Motoboy (`CourierPage.tsx`)

### 3.1 Botao "Abrir no Google Maps"
- Em cada card de entrega (disponivel e em rota), adicionar botao que abre `https://www.google.com/maps/search/?api=1&query=ENDERECO`

### 3.2 PWA para o motoboy
- O PWA ja esta configurado globalmente no `vite.config.ts`. A rota `/motoboy` ja e coberta pelo service worker
- Adicionar um botao "Instalar App" no header do painel do motoboy que usa o evento `beforeinstallprompt` (mesmo padrao ja usado no dashboard)
- Para iOS, mostrar instrucoes via toast

### 3.3 WhatsApp no cadastro
- Adicionar campo "WhatsApp" no formulario de registro do motoboy

## 4. Hook `useCourier.ts`

### 4.1 `useOrgDeliveries` com filtro de data
- Receber parametro `dateRange: { from: string; to: string }` opcional
- Aplicar `.gte("created_at", from).lt("created_at", to)` quando fornecido
- Query key incluira o range para cache correto

### 4.2 Novos hooks
- `useDeleteDelivery(orgId)`: deleta uma entrega por ID
- `useClearDeliveryHistory(orgId)`: deleta entregas com status `entregue`/`cancelada` antes de uma data
- `useCancelDelivery()`: atualiza status para `cancelada`
- Atualizar interface `Courier` para incluir `whatsapp?: string`

## 5. Resumo dos arquivos alterados

| Arquivo | Tipo de alteracao |
|---------|-------------------|
| `src/hooks/useCourier.ts` | Adicionar filtro de data, novos hooks, campo whatsapp no tipo |
| `src/components/dashboard/CourierDashboardTab.tsx` | Filtro de data, resumo do dia, excluir, limpar, status, lucro |
| `src/pages/CourierPage.tsx` | Google Maps, PWA install, campo WhatsApp no cadastro |
| Migracao SQL | Adicionar coluna `whatsapp` em `couriers` |

## Detalhes tecnicos

- O DatePicker usara os componentes Shadcn existentes (Popover + Calendar) com `pointer-events-auto`
- O filtro padrao sera "hoje" usando `startOfDay` / `endOfDay` do `date-fns`
- O botao de instalar PWA reutilizara o padrao de `beforeinstallprompt` ja presente no projeto
- A exclusao de entregas respeita a RLS existente (apenas o owner da org pode deletar)
- O lucro sera calculado no frontend fazendo uma query adicional aos `order_items` do pedido vinculado

