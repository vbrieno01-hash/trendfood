

## Adicionar aba "Melhorias" no Painel Admin

### O que será feito
Criar uma nova aba "Melhorias" no painel admin com uma lista de melhorias planejadas para o TrendFood. Cada melhoria terá um status selecionável (pendente, em andamento, pronto, outro dia). A lista será armazenada no banco de dados para persistir e poder ser atualizada ao vivo.

### Componentes

1. **Migração: tabela `improvement_tasks`**
   ```sql
   CREATE TABLE public.improvement_tasks (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     title text NOT NULL,
     description text,
     status text NOT NULL DEFAULT 'pendente', -- pendente, em_andamento, pronto, outro_dia
     priority integer NOT NULL DEFAULT 0,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now()
   );
   ALTER TABLE public.improvement_tasks ENABLE ROW LEVEL SECURITY;
   -- Apenas admin pode CRUD
   CREATE POLICY "improvements_select_admin" ON public.improvement_tasks FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
   CREATE POLICY "improvements_insert_admin" ON public.improvement_tasks FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
   CREATE POLICY "improvements_update_admin" ON public.improvement_tasks FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
   CREATE POLICY "improvements_delete_admin" ON public.improvement_tasks FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));
   ```

2. **Novo componente `src/components/admin/ImprovementsTab.tsx`**
   - Lista todas as melhorias ordenadas por prioridade/status
   - Cada card mostra titulo, descrição e um dropdown de status com cores:
     - **Pendente** (amarelo)
     - **Em andamento** (azul)
     - **Pronto** (verde)
     - **Outro dia** (cinza)
   - Botão para adicionar nova melhoria (título + descrição)
   - Botão para remover melhoria
   - Update do status via Supabase em tempo real
   - Contador de progresso no topo (ex: "5 de 12 concluídas")

3. **Integrar no AdminPage.tsx**
   - Adicionar `"melhorias"` ao tipo `AdminTab`
   - Adicionar item no `NAV_GROUPS` dentro de "Gestão" com ícone `ListChecks`
   - Renderizar `<ImprovementsTab />` quando `activeTab === "melhorias"`

4. **Seed inicial** — inserir as melhorias já discutidas:
   - Notificações push para status do pedido
   - Layout do cardápio estilo iFood com fotos em grid
   - Painel de métricas avançado
   - Tempo estimado de preparo por item
   - Exportar relatórios em PDF/Excel
   - Temas customizados por loja
   - Modo offline para KDS
   - Relatório de cancelamentos
   - Pausar categorias específicas
   - Onboarding interativo para novos donos

### Resultado
Uma aba dedicada no admin para acompanhar todas as melhorias, marcar o que foi feito, e eu posso adicionar novas a qualquer momento.

