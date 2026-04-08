

## Plano: Tornar o intervalo de pausa mais claro (dashboard + página pública)

### Problema
O ícone de café (☕) no dashboard é pequeno e críptico — nem o dono entende o que faz. Na página pública, as mensagens como "Em intervalo de descanso" e "☕ Intervalo · volta às 13:00" confundem os clientes.

### Alterações

**1. Dashboard — `src/components/dashboard/BusinessHoursSection.tsx`**
- Substituir o ícone de café sozinho por um **botão com texto**: `"+ Pausa"` (quando não tem) / `"✕ Remover pausa"` (quando tem)
- Na linha de intervalo, trocar "Intervalo" por **"⏸ Pausa (fecha temporariamente)"**
- Adicionar texto explicativo pequeno abaixo da tabela: _"A pausa fecha a loja temporariamente no horário definido. Clientes não conseguem fazer pedidos durante a pausa."_

**2. Página pública — `src/pages/UnitPage.tsx`**
- Trocar "Em intervalo de descanso" → **"Estamos em pausa"**
- Trocar "☕ Intervalo · volta às HH:MM" → **"⏸ Em pausa · voltamos às HH:MM"**
- Trocar "☕ Em intervalo · pedidos retornam às HH:MM" → **"⏸ Em pausa · voltamos às HH:MM"**
- No toast ao tentar pedir: "☕ Loja em intervalo. Retorna às HH:MM." → **"Estamos em pausa. Voltamos às HH:MM."**
- No botão do carrinho desabilitado: "☕ Intervalo" → **"⏸ Em pausa"**

**3. Página de mesa — `src/pages/TableOrderPage.tsx`**
- Mesmas trocas de texto: "Em intervalo de descanso" → "Estamos em pausa", "Voltamos às HH:MM"

**4. Drawer de item — `src/components/unit/ItemDetailDrawer.tsx`**
- Se `reason === "break"`, mostrar "⏸ Em pausa · voltamos às HH:MM" em vez de "🔒 Loja fechada"

### Impacto
- 4 arquivos alterados
- Textos mais simples e diretos: "pausa" em vez de "intervalo de descanso"
- Botão no dashboard com texto legível em vez de ícone misterioso

