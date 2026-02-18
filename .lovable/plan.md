
# Plataforma de Gestão de Pedidos para Salão

## Visão Geral

Esta feature transforma o sistema em uma plataforma completa de pedidos para restaurante/lanchonete, com três novas telas e um fluxo de pedido completo desde a mesa do cliente até a cozinha e o garçom.

---

## Banco de Dados — Novas tabelas

### Tabela `tables` (Mesas)

```text
tables
─────────────────────────────────────────
id              uuid (PK)
organization_id uuid (FK → organizations)
number          integer (obrigatório, número da mesa)
label           text (nullable, ex: "Mesa VIP")
created_at      timestamptz
```

- RLS: SELECT público (o cliente precisa acessar a mesa sem login)
- INSERT/UPDATE/DELETE: somente o dono da organização

### Tabela `orders` (Pedidos)

```text
orders
─────────────────────────────────────────
id              uuid (PK)
organization_id uuid (FK → organizations)
table_number    integer (número da mesa)
status          text: 'pending' | 'preparing' | 'ready' | 'delivered'
notes           text (nullable — observações gerais do pedido)
created_at      timestamptz
```

### Tabela `order_items` (Itens do Pedido)

```text
order_items
─────────────────────────────────────────
id          uuid (PK)
order_id    uuid (FK → orders)
menu_item_id uuid (FK → menu_items)
name        text (snapshot do nome na hora do pedido)
price       numeric (snapshot do preço)
quantity    integer (default 1)
```

- RLS: SELECT público (cozinha e garçom visualizam sem login)
- INSERT: público (cliente finaliza o pedido sem login)
- UPDATE: somente o dono (para atualizar status)
- DELETE: somente o dono

---

## Arquivos a criar

| Arquivo | Descrição |
|---|---|
| `src/hooks/useOrders.ts` | Hook React Query para pedidos com Realtime |
| `src/components/dashboard/TablesTab.tsx` | Aba de gerenciamento de mesas e QR Codes |
| `src/pages/TableOrderPage.tsx` | Página pública `/unidade/[slug]/mesa/[numero]` — cliente monta e envia pedido |
| `src/pages/KitchenPage.tsx` | Tela `/cozinha?org=[slug]` — Painel da Cozinha com Realtime |
| `src/pages/WaiterPage.tsx` | Tela `/garcom?org=[slug]` — Painel do Garçom |

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/App.tsx` | Registrar 3 novas rotas |
| `src/pages/DashboardPage.tsx` | Adicionar aba "Mesas" no sidebar |
| `src/pages/UnitPage.tsx` | Manter existente, apenas redirecionar clientes de mesa para a nova rota |

---

## Detalhamento de cada parte

### 1. Aba "Mesas" no Painel do Lojista (`TablesTab.tsx`)

Layout:
```text
┌───────────────────────────────────────────────────────┐
│  Mesas                                 [+ Nova Mesa]  │
│  5 mesas configuradas                                 │
├───────────────────────────────────────────────────────┤
│  Mesa 1  /unidade/slug/mesa/1  [QR] [Copiar] [Lixo]  │
│  Mesa 2  /unidade/slug/mesa/2  [QR] [Copiar] [Lixo]  │
│  ...                                                  │
├───────────────────────────────────────────────────────┤
│  [Ver Cozinha →]          [Ver Painel do Garçom →]    │
└───────────────────────────────────────────────────────┘
```

- Botão **+ Nova Mesa**: abre modal para escolher o número da mesa (ex: Mesa 1, Mesa 2...)
- **QR Code**: usa a biblioteca `qrcode.react` (a ser instalada) para gerar um QR Code inline que o lojista pode baixar ou imprimir
- **Copiar Link**: copia a URL `/unidade/[slug]/mesa/[numero]` para o clipboard
- Atalhos para `/cozinha?org=[slug]` e `/garcom?org=[slug]`

### 2. Página do Cliente na Mesa (`TableOrderPage.tsx`)

Rota: `/unidade/[slug]/mesa/[numero]`

```text
┌─────────────────────────────────────────┐
│  🍔 Burger Palace — Mesa 3              │
├─────────────────────────────────────────┤
│  🍔 Hambúrgueres                        │
│  [Foto] Burguer Classic  R$25,90  [+1] │
│  [Foto] Burguer Duplo    R$32,00  [+1] │
│  🥤 Bebidas                             │
│  [Foto] Coca-Cola        R$8,00   [+1] │
├─────────────────────────────────────────┤
│  Observações: [__________________]      │
├─────────────────────────────────────────┤
│  Carrinho: 3 itens — R$ 66,00          │
│  [Finalizar Pedido]                     │
└─────────────────────────────────────────┘
```

- Exibe apenas itens com `available = true`
- Botões `+` e `−` para montar o carrinho localmente (estado no componente)
- Campo de "Observações" livre (ex: "Sem cebola")
- Botão **Finalizar Pedido**: INSERT em `orders` + INSERT em `order_items` → exibe tela de confirmação
- Sem necessidade de login — pedido é anônimo

### 3. Painel da Cozinha — KDS (`KitchenPage.tsx`)

Rota: `/cozinha?org=[slug]`

```text
┌──────────────────────────────────────────────────────┐
│  🍳 Cozinha — Burger Palace        [ao vivo]         │
├──────────────────────────────────────────────────────┤
│  [NOVO!] Mesa 3 — 14:32           [Marcar como Pronto]│
│  • 2x Burguer Classic                                │
│  • 1x Coca-Cola                                      │
│  Obs: Sem cebola no burger                           │
│                                                      │
│  [NOVO!] Mesa 1 — 14:28           [Marcar como Pronto]│
│  • 1x Burguer Duplo                                  │
└──────────────────────────────────────────────────────┘
```

- Exibe pedidos com status `pending` e `preparing`, ordenados do mais novo ao mais antigo
- **Supabase Realtime**: escuta INSERT e UPDATE na tabela `orders` — atualização instantânea
- **Alerta sonoro**: ao receber um novo pedido, toca um som de sino (usando a Web Audio API nativa — sem dependência extra)
- **Alerta visual**: badge pulsante "NOVO!" em laranja nos pedidos recém-chegados (nos últimos 30 segundos)
- **Botão "Marcar como Pronto"**: atualiza `status` para `'ready'`
- O card do pedido some da tela da cozinha assim que marcado como Pronto
- Sem necessidade de login — tela pública mas acessada apenas internamente

### 4. Painel do Garçom (`WaiterPage.tsx`)

Rota: `/garcom?org=[slug]`

```text
┌──────────────────────────────────────────────────────┐
│  🧍 Garçom — Burger Palace         [ao vivo]         │
├──────────────────────────────────────────────────────┤
│  ✅ PRONTO — Mesa 3 — 14:33                          │
│  • 2x Burguer Classic                                │
│  • 1x Coca-Cola                                      │
│  [Marcar como Entregue]                              │
└──────────────────────────────────────────────────────┘
```

- Exibe somente pedidos com status `ready`
- **Supabase Realtime**: atualiza automaticamente quando a cozinha marca como Pronto
- **Botão "Marcar como Entregue"**: atualiza `status` para `'delivered'`
- Destaque em verde e badge "PRONTO" para chamar atenção

---

## Novas Rotas em `App.tsx`

```text
/unidade/:slug/mesa/:tableNumber  → TableOrderPage (cliente)
/cozinha                          → KitchenPage (cozinha)
/garcom                           → WaiterPage (garçom)
```

---

## Fluxo completo de um pedido

```text
Lojista cria Mesa 3 no painel → gera QR Code → imprime e cola na mesa

Cliente escaneia QR → acessa /unidade/burger-place/mesa/3
→ escolhe itens → escreve observação → clica "Finalizar Pedido"
→ INSERT em orders (status: 'pending') + order_items
→ Confirmação na tela do cliente: "Pedido enviado! 🎉"

Cozinha (KDS em /cozinha?org=burger-place):
→ Realtime detecta INSERT → som de sino + badge "NOVO!"
→ Cozinheiro prepara → clica "Marcar como Pronto"
→ UPDATE orders SET status = 'ready'

Garçom (/garcom?org=burger-place):
→ Realtime detecta UPDATE → pedido aparece em verde "PRONTO"
→ Garçom entrega → clica "Marcar como Entregue"
→ UPDATE orders SET status = 'delivered'
→ Some da lista do garçom
```

---

## Resumo dos arquivos

| Arquivo | Ação |
|---|---|
| Banco de dados | Migration: tabelas `tables`, `orders`, `order_items` com RLS |
| `src/hooks/useOrders.ts` | Criar (novo) — CRUD + Realtime |
| `src/components/dashboard/TablesTab.tsx` | Criar (novo) — gestão de mesas + QR Code |
| `src/pages/TableOrderPage.tsx` | Criar (novo) — página do cliente na mesa |
| `src/pages/KitchenPage.tsx` | Criar (novo) — KDS com Realtime + som |
| `src/pages/WaiterPage.tsx` | Criar (novo) — painel do garçom |
| `src/App.tsx` | Editar — 3 novas rotas |
| `src/pages/DashboardPage.tsx` | Editar — aba "Mesas" no sidebar |

Nenhuma mudança no sistema de auth, nas abas existentes (Cardápio, Mural, Perfil, Configurações) ou na landing page.

---

## Dependência a instalar

- `qrcode.react` — para gerar QR Codes no painel de Mesas (sem API externa)

---

## O que NÃO muda

- Sistema de autenticação e organização
- Cardápio (MenuTab + UnitPage)
- Mural de sugestões (MuralTab)
- Landing page
- HomeTab
