

## Tour Guiado Interativo para Novos Donos

### O que será feito
Após o onboarding wizard (4 etapas iniciais), o dono verá um tour guiado com tooltips que destacam as principais áreas do dashboard. O tour aparece apenas na **primeira visita ao dashboard** (controlado por um flag `dashboard_tour_done` na tabela `organizations`).

### Abordagem
Usar uma solução **100% custom** (sem biblioteca externa) com tooltips posicionados via refs nos elementos do sidebar e conteúdo. Cada step destaca um elemento com overlay escuro ao redor.

### Steps do Tour (6 passos)
1. **Home** — "Aqui você vê o resumo do dia: pedidos, faturamento e atalhos rápidos"
2. **Cardápio** — "Monte seu cardápio com categorias, fotos e preços"
3. **Pedidos/Operacional** — "Gerencie pedidos em tempo real, cozinha e garçom"
4. **Mesas** — "Crie mesas e gere QR Codes para pedidos presenciais"
5. **Relatórios** — "Acompanhe vendas, produtos mais vendidos e faturamento"
6. **Perfil da Loja** — "Configure WhatsApp, endereço, logo e horários"

### Alterações

1. **Migração SQL** — Adicionar coluna `dashboard_tour_done boolean default false` na tabela `organizations`

2. **Novo componente: `src/components/dashboard/DashboardTour.tsx`**
   - Recebe `orgId` e `onComplete` como props
   - Array de steps com `targetId`, `title`, `description`, `position`
   - Renderiza overlay escuro com recorte no elemento alvo
   - Tooltip posicionado ao lado do elemento destacado
   - Botões "Próximo" / "Pular" / "Concluir"
   - Ao concluir ou pular, marca `dashboard_tour_done = true` no banco

3. **`src/pages/DashboardPage.tsx`**
   - Adicionar `id` nos elementos-chave do sidebar (home btn, grupos do menu)
   - Adicionar `data-tour="home"`, `data-tour="menu"`, etc. nos botões de navegação
   - Renderizar `<DashboardTour>` quando `onboarding_done === true && dashboard_tour_done === false`
   - Buscar `dashboard_tour_done` junto com os dados da org (já vem no select do useAuth)

4. **`src/hooks/useAuth.tsx`** — Incluir `dashboard_tour_done` no select da org

5. **Atualizar `improvement_tasks`** — Marcar "Onboarding interativo para novos donos" como `pronto`

### Arquivos
- Nova migração SQL (1 coluna)
- `src/components/dashboard/DashboardTour.tsx` (novo)
- `src/pages/DashboardPage.tsx` (adicionar ids + renderizar tour)
- `src/hooks/useAuth.tsx` (incluir campo no select)

