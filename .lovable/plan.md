
# Dois Problemas a Corrigir

## Problema 1 — Seta "← Início" volta para a Landing Page em vez do Dashboard

Na `UnitPage`, o header tem `<Link to="/">` fixo. Quando o admin navega do dashboard para a página da mesa, ao clicar em "← Início" ele vai para a Landing Page, mas deveria voltar ao `/dashboard`.

**Solução:** Usar `useNavigate` e detectar de onde o usuário veio com `document.referrer` ou, de forma mais confiável, usar o estado de navegação do React Router (`location.state`). Quando o `TablesTab` navegar, passará `{ from: 'dashboard' }` como state. A `UnitPage` lerá esse state e ajustará o destino do botão de voltar.

```tsx
// TablesTab.tsx — ao navegar para a mesa:
navigate(`/unidade/${organization.slug}/mesa/${t.number}`, { state: { from: "dashboard" } });

// UnitPage.tsx — lê o state:
const location = useLocation();
const fromDashboard = location.state?.from === "dashboard";

// Botão de voltar condicional:
<button onClick={() => fromDashboard ? navigate("/dashboard") : navigate("/")}>
  ← {fromDashboard ? "Dashboard" : "Início"}
</button>
```

---

## Problema 2 — Clique na Mesa do Dashboard Abre o Cardápio WhatsApp (UnitPage)

O usuário explica: *"o cardápio é só pra quem não está no local"* — ou seja, a `UnitPage` com checkout via WhatsApp é para clientes externos (delivery/takeout). Quando o admin clica numa mesa no dashboard, ele quer ver a **experiência de pedido no local** (`TableOrderPage`) — onde o cliente que está sentado à mesa faz o pedido diretamente pelo sistema (sem WhatsApp).

A `TableOrderPage` existe em `src/pages/TableOrderPage.tsx` e é exatamente isso: um cardápio simplificado de pedido presencial que envia o pedido direto para a cozinha (sem WhatsApp).

A rota `/unidade/:slug/mesa/:tableNumber` foi alterada na última sessão para apontar para `UnitPage` em vez de `TableOrderPage`. Isso foi o erro.

**Solução:**
- Reverter a rota `/unidade/:slug/mesa/:tableNumber` para usar `TableOrderPage` novamente no `App.tsx`
- Na `TableOrderPage`, adicionar o estado de navegação para que a seta de "← Início" volte ao `/dashboard` quando vier do dashboard
- Na `UnitPage`, remover o código de `tableNumber` adicionado anteriormente (o banner de mesa e o `tableNum` da mensagem WhatsApp) pois não faz mais sentido — a UnitPage é para cardápio externo

---

## Mudanças Detalhadas

### `src/App.tsx`
Reverter a rota para usar `TableOrderPage`:

```tsx
// Antes (errado — resultado das últimas sessões):
<Route path="/unidade/:slug/mesa/:tableNumber" element={<UnitPage />} />

// Depois (correto):
import TableOrderPage from "./pages/TableOrderPage";
<Route path="/unidade/:slug/mesa/:tableNumber" element={<TableOrderPage />} />
```

### `src/components/dashboard/TablesTab.tsx`
Ao navegar, passar o state `{ from: "dashboard" }` para que a `TableOrderPage` saiba de onde veio:

```tsx
onClick={() => navigate(`/unidade/${organization.slug}/mesa/${t.number}`, { state: { from: "dashboard" } })}
```

### `src/pages/TableOrderPage.tsx`
Adicionar botão de voltar contextual no header, usando `useLocation` para detectar se veio do dashboard:

```tsx
import { useParams, useLocation, useNavigate } from "react-router-dom";

const location = useLocation();
const navigate = useNavigate();
const fromDashboard = location.state?.from === "dashboard";

// No header, adicionar:
<button onClick={() => fromDashboard ? navigate("/dashboard") : navigate(-1)}>
  <ArrowLeft className="w-4 h-4" />
  <span className="text-sm">{fromDashboard ? "Dashboard" : "Voltar"}</span>
</button>
```

### `src/pages/UnitPage.tsx`
Reverter as mudanças de `tableNumber` que foram adicionadas nas últimas sessões:
- Remover leitura de `tableNumber` do `useParams`
- Remover o banner "🪑 Você está na Mesa X"
- Remover `tableNum` da mensagem do WhatsApp
- Remover o texto contextual da mesa no banner de boas-vindas
- O `<Link to="/">` do header pode permanecer simples (pois a UnitPage agora é só para cardápio público)

---

## Resultado Final

| Fluxo | Comportamento |
|---|---|
| Cliente escaneia QR Code da mesa | Abre `TableOrderPage` — pedido presencial, sem WhatsApp |
| Admin clica na mesa no dashboard | Abre `TableOrderPage` na mesma aba |
| Admin clica "← Voltar" na TableOrderPage | Volta ao `/dashboard` |
| Cliente acessa `/unidade/slug` (sem mesa) | Abre `UnitPage` — cardápio público com checkout WhatsApp |
| Cliente clica "← Início" na UnitPage | Vai para a Landing Page `/` |

---

## Arquivos Afetados

| Arquivo | Ação |
|---|---|
| `src/App.tsx` | Restaurar `TableOrderPage` na rota `/mesa/:tableNumber` |
| `src/pages/TableOrderPage.tsx` | Adicionar botão de voltar contextual (dashboard vs. direto) |
| `src/components/dashboard/TablesTab.tsx` | Passar `state: { from: "dashboard" }` ao navegar |
| `src/pages/UnitPage.tsx` | Remover código de `tableNumber` (banner, WhatsApp, useParams) |
