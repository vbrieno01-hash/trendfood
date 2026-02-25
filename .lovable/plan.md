

# Plano: Aplicar fallback robusto do WhatsApp em todos os arquivos

## Diagnóstico

A correção de fallback do WhatsApp foi aplicada apenas em `UnitPage.tsx`. Existem mais 4 locais no código que usam `window.open` direto para WhatsApp sem nenhum fallback:

1. **`src/pages/CourierPage.tsx`** (linha 542) — Notifica o cliente quando o motoboy aceita a entrega
2. **`src/components/admin/SalesChatTab.tsx`** (linha 192) — Abre o WhatsApp de um lead/contato
3. **`src/components/dashboard/SettingsTab.tsx`** (linha 164) — Compartilhar via WhatsApp
4. **`src/pages/DashboardPage.tsx`** (linha 752) — Botão "Indique o TrendFood"

O `WaiterPage.tsx` já usa `<a href>` com `target="_blank"`, que é a abordagem mais segura e não precisa de alteração.

## O que será feito

Aplicar a mesma lógica de 3 camadas em todos os 4 arquivos:
1. Tentar `window.open`
2. Fallback para `window.location.href`
3. Toast com botão manual caso ambos falhem

Para os botões de compartilhamento (SettingsTab e DashboardPage), onde navegar para fora da página não é desejável, usar apenas `window.open` + toast de fallback (sem `location.href`).

## Seção técnica

```text
Arquivo 1: src/pages/CourierPage.tsx (linha 542)
  Antes:
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
  Depois:
    Mesma lógica de 3 camadas do UnitPage (open → location.href → toast)
  + import ToastAction (se necessário)

Arquivo 2: src/components/admin/SalesChatTab.tsx (linha 192)
  Antes:
    window.open(`https://wa.me/${number}`, "_blank");
  Depois:
    open → location.href → toast com botão "Abrir"

Arquivo 3: src/components/dashboard/SettingsTab.tsx (linha 164)
  Antes:
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  Depois:
    open → toast (sem location.href, pois é botão de compartilhar dentro do dashboard)

Arquivo 4: src/pages/DashboardPage.tsx (linha 752)
  Antes:
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  Depois:
    open → toast (sem location.href, mesma razão)
```

Cada arquivo receberá os imports necessários (`ToastAction`, `ExternalLink`, `useToast`/`toast`) conforme já existam ou não.

