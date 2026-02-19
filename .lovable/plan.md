
# Integrar Cozinha (KDS) e Garçom ao Dashboard Principal

## Visão Geral

Atualmente, `KitchenPage` e `WaiterPage` são páginas independentes que usam `?org=slug` na URL e têm seu próprio header. O objetivo é transformá-los em **painéis internos do dashboard**, dentro do mesmo layout com sidebar — exatamente como as abas "Home", "Mesas", etc.

---

## Estratégia de Implementação

A abordagem mais limpa é **extrair o conteúdo funcional** de cada página em componentes de aba (`KitchenTab` e `WaiterTab`), que recebem o `organization` diretamente do contexto de autenticação (já disponível no `DashboardPage`) — eliminando a necessidade do `?org=slug`.

```text
DashboardPage
├── Sidebar (nav lateral)
│   ├── Home
│   ├── Meu Cardápio
│   ├── Mesas
│   ├── Gerenciar Mural
│   ├── ── Operações ──        ← novo separador visual
│   ├── Cozinha (KDS)          ← novo item
│   ├── Painel do Garçom       ← novo item
│   ├── ── ──
│   ├── Perfil da Loja
│   └── Configurações
└── <main>
    └── {activeTab === "kitchen" && <KitchenTab orgId={org.id} />}
        {activeTab === "waiter"  && <WaiterTab  orgId={org.id} />}
```

---

## Arquivos a Criar

### 1. `src/components/dashboard/KitchenTab.tsx`

Extrai toda a lógica de `KitchenPage.tsx` como componente de aba:
- Recebe `orgId: string` como prop (sem necessidade de URL params)
- Mantém toda a lógica de `loadingIds`, `playBell`, realtime via Supabase, badge "NOVO!", timer de 5s
- Remove o `<header>` e `min-h-screen` — adapta para ocupar o espaço central do dashboard
- Adiciona um título de seção estilizado no topo da aba

### 2. `src/components/dashboard/WaiterTab.tsx`

Extrai toda a lógica de `WaiterPage.tsx` como componente de aba:
- Recebe `orgId: string` como prop
- Mantém realtime, botão "Marcar como Entregue"
- Remove `<header>` e `min-h-screen`
- Adiciona loading state e prevenção de duplo clique (melhoria sobre a versão atual)

---

## Arquivos a Modificar

### 3. `src/pages/DashboardPage.tsx`

**a) Atualizar o tipo `TabKey`:**
```tsx
type TabKey = "home" | "menu" | "tables" | "mural" | "kitchen" | "waiter" | "profile" | "settings";
```

**b) Adicionar novos ícones e items ao `navItems`:**
```tsx
import { Flame, BellRing } from "lucide-react";

// Inserir após "mural", antes de "profile":
{ key: "kitchen", icon: <Flame className="w-4 h-4" />, label: "Cozinha (KDS)" },
{ key: "waiter",  icon: <BellRing className="w-4 h-4" />, label: "Painel do Garçom" },
```

**c) Adicionar separador visual "Operações" no sidebar** — um pequeno label de seção entre as abas de gestão e as abas operacionais, sem quebrar o layout.

**d) Renderizar as novas abas em `<main>`:**
```tsx
{activeTab === "kitchen" && <KitchenTab orgId={organization.id} />}
{activeTab === "waiter"  && <WaiterTab  orgId={organization.id} />}
```

**e) Ajustar o padding do `<main>`** para as abas de cozinha e garçom — elas são densas e se beneficiam de menos padding lateral para mostrar mais cards.

---

## Ícones Utilizados (lucide-react — já instalado)

| Painel | Ícone | Justificativa |
|---|---|---|
| Cozinha (KDS) | `Flame` | Representa calor, fogo, cozinha |
| Painel do Garçom | `BellRing` | Sino de chamada, notificação de entrega |

---

## Detalhes Técnicos

- **Sem mudança nas rotas existentes** — `/cozinha` e `/garcom` continuam funcionando para uso em dispositivos dedicados (tablet na cozinha). A integração ao dashboard é **adicional**.
- **Sem queries duplicadas** — o `orgId` vem direto do `organization.id` do contexto auth, sem necessidade de buscar a organização novamente.
- **Realtime**: cada tab faz seu próprio `subscribe`/`unsubscribe` via `useEffect` — quando a aba não está ativa, o componente não é renderizado, então não haverá conexões abertas desnecessariamente.
- **Responsividade**: os cards de pedido já usam `grid gap-4 md:grid-cols-2` — funcionará bem no espaço central do dashboard tanto em mobile quanto em desktop.

---

## Arquivos Afetados

| Arquivo | Ação |
|---|---|
| `src/components/dashboard/KitchenTab.tsx` | Criar — conteúdo funcional da tela de cozinha |
| `src/components/dashboard/WaiterTab.tsx` | Criar — conteúdo funcional do painel do garçom |
| `src/pages/DashboardPage.tsx` | Modificar — adicionar itens no sidebar e renderizar novas abas |
| `src/pages/KitchenPage.tsx` | Sem alteração — continua disponível como rota independente |
| `src/pages/WaiterPage.tsx` | Sem alteração — continua disponível como rota independente |
