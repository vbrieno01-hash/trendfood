

## Adicionar animação suave nos cards de pedidos

### Problema
Os cards de pedidos no WaiterTab (Prontos, Pagamento, Aguardando Confirmação) não têm animação de entrada — aparecem abruptamente. O KitchenTab já usa `animate-dashboard-fade-in` nos cards pendentes, mas não de forma consistente.

### Alterações

**`src/components/dashboard/WaiterTab.tsx`** — Adicionar `animate-dashboard-fade-in` nos 3 tipos de cards:
- Linha 177: adicionar classe `animate-dashboard-fade-in` no card de "Aguardando Confirmação"
- Linha 303: adicionar classe `animate-dashboard-fade-in` no card de "Prontos para Entrega"  
- Linha 443: adicionar classe `animate-dashboard-fade-in` no card de "Aguardando Pagamento"

**`src/components/dashboard/KitchenTab.tsx`** — Garantir que os cards de "Preparando" (~linha 626) também tenham a animação (os pendentes já têm).

A animação `animate-dashboard-fade-in` já existe no CSS (`admin-fade-in`: fade + slide up 0.5s) — só precisa aplicar a classe nos cards que faltam.

