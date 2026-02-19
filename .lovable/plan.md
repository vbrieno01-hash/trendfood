
# Relatório PDF Mensal no Painel Admin

## Objetivo

Implementar um painel de **Relatório Mensal** no `/admin` que permite ao administrador gerar um PDF por loja com faturamento, número de pedidos e ticket médio do mês selecionado. Ao finalizar, o status do card "Relatório PDF Mensal" muda de `planned` para `available`.

---

## Estratégia de geração de PDF

Não há biblioteca de PDF instalada no projeto. A abordagem mais simples e sem dependências externas é usar **`window.print()`** com estilos CSS `@media print` em uma janela separada (`window.open`). Isso gera um PDF nativo via o diálogo de impressão do browser (opção "Salvar como PDF"), sem instalar pacotes adicionais.

Vantagens:
- Zero dependências novas
- Funciona em qualquer browser moderno
- HTML/CSS total — formatação rica, logo, cores

---

## Fluxo do usuário

```text
/admin (seção Relatório Mensal)
  ├── Seletor de mês (ex: Janeiro 2026)
  ├── Grid de lojas com métricas do mês:
  │     ├── Faturamento (R$ X,XX)
  │     ├── Pedidos (N pedidos)
  │     └── Ticket Médio (R$ X,XX)
  └── Botão "Gerar PDF" por loja  →  abre janela de impressão com layout do relatório
```

---

## Dados buscados para o relatório

A query usa os dados já disponíveis nas tabelas `orders` e `order_items`, filtrados por `organization_id` e pelo intervalo de datas do mês selecionado (`>= início do mês` e `< início do mês seguinte`). Apenas pedidos com `status = 'delivered'` e `paid = true` são contados como receita.

Campos do relatório por loja:
- Nome da loja, emoji, slug
- Mês/ano de referência
- Total de pedidos entregues
- Total de pedidos pagos
- Faturamento total (sum de `price * quantity` dos itens de pedidos pagos)
- Ticket médio (faturamento / pedidos pagos)
- Lista dos top 5 itens mais vendidos no período (nome + quantidade)

---

## Arquivos a criar/modificar

| Arquivo | Ação | Descrição |
|---|---|---|
| `src/pages/AdminPage.tsx` | Modificar | Adicionar seção "Relatório Mensal" com seletor de mês, grid de métricas por loja e botão "Gerar PDF" por loja |
| `src/pages/AdminPage.tsx` | Modificar | Atualizar `FEATURES` — status de "Relatório PDF Mensal" de `planned` → `available` com `actionLabel` e `actionHref` |

---

## Estrutura de implementação dentro do AdminPage.tsx

### 1. Novo estado e dados

```typescript
// Dentro de AdminContent
const [reportMonth, setReportMonth] = useState(() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
});
const [reportData, setReportData] = useState<ReportRow[]>([]);
const [loadingReport, setLoadingReport] = useState(false);
```

Interface `ReportRow`:
```typescript
interface ReportRow {
  org: OrgRow;
  totalOrders: number;
  paidOrders: number;
  revenue: number;
  avgTicket: number;
  topItems: { name: string; qty: number }[];
}
```

### 2. Função de carga dos dados do relatório

Ao trocar o mês, busca `orders` filtrados pelo intervalo de datas do mês, faz join com `order_items` (select inline) e calcula as métricas localmente no client — sem nova migração de banco de dados.

### 3. Função `generatePdf(row: ReportRow)`

Abre `window.open()` com HTML completo formatado:
- Cabeçalho: logo texto "TrendFood", nome da loja, mês de referência
- Cards: Faturamento, Pedidos Pagos, Ticket Médio
- Tabela: top 5 itens mais vendidos
- Rodapé: gerado em {data/hora}
- CSS `@media print` embutido para ocultar botões e otimizar impressão
- Chama `window.print()` automaticamente após carregar

### 4. UI da nova seção

```
┌─────────────────────────────────────────────────────┐
│  📊 Relatório Mensal    [Seletor de Mês ▼]          │
│                                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │ Loja A  │  │ Loja B  │  │ Loja C  │             │
│  │ R$1.200 │  │ R$ 800  │  │ R$ 600  │             │
│  │ 24 ped. │  │ 16 ped. │  │ 12 ped. │             │
│  │ TM R$50 │  │ TM R$50 │  │ TM R$50 │             │
│  │[Gerar PDF]│ │[Gerar PDF]│ │[Gerar PDF]│           │
│  └─────────┘  └─────────┘  └─────────┘             │
└─────────────────────────────────────────────────────┘
```

---

## Segurança

- O painel de relatórios já está dentro do `AdminContent`, que só é renderizado após verificar `isAdmin` (via `has_role` no banco). 
- Nenhuma nova RLS é necessária — a query reutiliza as políticas `SELECT` públicas já existentes nas tabelas `orders` e `order_items`, que são lidas somente pelo admin autenticado neste contexto.

---

## Mudança no card de Features

```typescript
// ANTES
{
  icon: <FileText className="w-5 h-5" />,
  title: "Relatório PDF Mensal",
  description: "Relatório automático por e-mail com faturamento, pedidos e ticket médio do mês.",
  status: "planned",
},

// DEPOIS
{
  icon: <FileText className="w-5 h-5" />,
  title: "Relatório PDF Mensal",
  description: "Gere relatórios mensais por loja com faturamento, pedidos e ticket médio diretamente no painel admin.",
  status: "available",
  actionLabel: "Gerar relatório",
  actionHref: "/admin",
},
```

---

## Resumo das mudanças

- 1 arquivo modificado: `src/pages/AdminPage.tsx`
- Sem novas dependências
- Sem migrations de banco de dados
- PDF gerado via impressão nativa do browser (Ctrl+P / Salvar como PDF)
- Seção de relatório inserida entre as Lojas da Plataforma e o Feature Roadmap
