

# Relatorio de Motoboys para o Dono da Loja

## O que o dono vai poder ver

Uma nova secao "Relatorio de Motoboys" dentro da aba Motoboys do dashboard, com:

### KPIs principais
- **Total de entregas** no periodo
- **Total pago** a motoboys (R$)
- **Distancia total** percorrida (km)
- **Tempo total trabalhado** (soma dos turnos)

### Ranking de motoboys
- Tabela ordenada por numero de entregas, mostrando: nome, entregas feitas, km rodados, valor ganho, horas trabalhadas
- Barra de progresso visual por motoboy

### Grafico de entregas por dia
- BarChart (mesmo estilo do ReportsTab de vendas) mostrando entregas/dia no periodo

### Grafico de horarios de pico de entrega
- Distribuicao por hora do dia

### Exportar relatorio
- Botao para baixar como imagem PNG ou PDF (mesmo padrao do ReportsTab)

## Periodo
- Filtro de 7d / 30d / 90d (mesmo padrao do ReportsTab de vendas)

## Alteracoes tecnicas

### 1. Novo componente `src/components/dashboard/CourierReportSection.tsx`

Componente isolado que recebe `orgId`, `orgName`, `orgEmoji` e renderiza todo o relatorio. Usa os hooks existentes:
- `useOrgCouriers(orgId)` -- lista de motoboys
- `useOrgDeliveries(orgId, dateRange)` -- entregas no periodo (reutilizado com dateRange calculado pelo periodo)
- `useOrgShiftHistory(orgId, dateRange)` -- turnos no periodo

Nao precisa de nova tabela nem migracao -- tudo ja existe no banco.

### 2. Integracao no `CourierDashboardTab.tsx`

Adicionar o `CourierReportSection` no final da pagina, abaixo da listagem de motoboys cadastrados. Separado por um titulo "Relatorio de Motoboys".

### 3. Exportacao

Seguir o mesmo padrao do `ReportsTab`: gerar HTML com `buildReportHtml()`, exportar via `html2canvas` (PNG) ou `window.print()` (PDF). Incluir watermark TrendFood e dados da loja no cabecalho.

## Resumo de arquivos

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/dashboard/CourierReportSection.tsx` | Novo componente com KPIs, ranking, graficos e export |
| `src/components/dashboard/CourierDashboardTab.tsx` | Importar e renderizar o CourierReportSection no final |

