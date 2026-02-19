

# Expandir Painel Administrativo com Todas as Funcionalidades

## Resumo

Vamos adicionar 5 novas secoes ao painel admin, transformando-o em um centro de controle completo da plataforma.

## Novas funcionalidades

### 1. Gerenciamento de Planos
- Dropdown em cada card de loja para alterar o plano (free/pro/enterprise)
- Botao para estender ou resetar o trial (definir nova data de trial_ends_at)
- Atualiza diretamente as colunas `subscription_plan` e `trial_ends_at` na tabela `organizations`

### 2. Grafico de Crescimento
- Grafico de linha usando Recharts (ja instalado) mostrando:
  - Evolucao de lojas cadastradas por mes (ultimos 6 meses)
  - Evolucao de pedidos por mes
- Dados calculados a partir dos campos `created_at` das tabelas `organizations` e `orders`

### 3. Feed de Pedidos Recentes
- Lista dos ultimos 20 pedidos de todas as lojas em tempo real
- Mostra: nome da loja, mesa, valor, status, horario
- Usa realtime do banco para atualizar automaticamente quando novos pedidos chegam

### 4. Exportar CSV
- Botao "Exportar CSV" na secao de lojas que gera um arquivo com: nome, slug, endereco, status, qtd itens, qtd pedidos, receita, data de criacao
- Botao "Exportar CSV" na secao de relatorio mensal com dados do mes selecionado

### 5. Configuracoes da Plataforma
- Interface para editar as taxas de entrega padrao da tabela `platform_config`
- Campos editaveis: fee_tier1, fee_tier2, fee_tier3, tier1_km, tier2_km, free_above
- Usa o hook `usePlatformDeliveryConfig` ja existente

## Detalhes tecnicos

### Arquivo: `src/pages/AdminPage.tsx`

O arquivo sera expandido com as seguintes mudancas:

**Imports adicionais:**
- `LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer` de `recharts`
- `Download, Settings, Clock, RefreshCw, Crown` de `lucide-react`
- `usePlatformDeliveryConfig, useUpdatePlatformDeliveryConfig` do hook existente
- `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` dos componentes UI

**Novas secoes no JSX (ordem no layout):**

1. **KPI Cards** (existente)
2. **Grafico de Crescimento** (novo) - secao com 2 graficos lado a lado
3. **Feed de Pedidos Recentes** (novo) - lista scrollavel com os ultimos 20 pedidos
4. **Lojas da Plataforma** (existente, com botao CSV e dropdown de plano nos cards)
5. **Relatorio Mensal** (existente, com botao CSV)
6. **Configuracoes da Plataforma** (novo) - formulario de taxas de entrega
7. **Funcionalidades** (existente)

**Logica de dados:**

- Os dados de crescimento serao calculados no `useEffect` existente agrupando `created_at` por mes
- O feed de pedidos usara uma query separada com `.order('created_at', { ascending: false }).limit(20)` e subscribe via realtime
- A alteracao de plano usara `supabase.from('organizations').update(...)` direto (admin tem RLS via has_role)
- O CSV sera gerado client-side com `Blob` e `URL.createObjectURL`

### Migration SQL necessaria

Adicionar policy de UPDATE na tabela `organizations` para admins:

```sql
CREATE POLICY "admin_update_organizations"
ON public.organizations
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

Habilitar realtime para pedidos:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
```

### Nenhuma nova tabela necessaria
Todos os dados ja existem nas tabelas atuais. Apenas precisamos da policy de UPDATE para admin e do realtime habilitado.

