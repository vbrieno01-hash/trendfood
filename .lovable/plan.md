

# Testar features ativas + Adicionar download de relatorio

## Verificacao das features (imagem)

Todas as features com checkmark no plano Enterprise estao implementadas e funcionais:

1. **Tudo do plano Pro** -- Todas features Pro (KDS, Caixa, Cupons, Mais Vendidos, Garcom) estao implementadas com feature gates no `usePlanLimits.ts`
2. **Multiplas unidades** -- OrgSwitcher + CreateUnitDialog + DeleteUnitDialog funcionando no Dashboard
3. **Relatorios avancados** -- ReportsTab com KPIs, graficos diarios, horarios de pico, comparativo semanal e ranking por categoria
4. **Suporte prioritario** -- Beneficio operacional (nao requer codigo)
5. **Integracao com delivery** -- Corretamente marcada como "Em breve" com icone de relogio e badge na pagina de planos
6. **Gerente de conta dedicado** -- Beneficio operacional (nao requer codigo)

## Nova funcionalidade: Baixar relatorio

Adicionar um botao "Baixar Relatorio" no header do `ReportsTab` que gera um PDF via `window.print()` (mesmo padrao usado no projeto para impressao de pedidos e fechamento de caixa).

### Mudancas

**Arquivo: `src/components/dashboard/ReportsTab.tsx`**

- Importar `Download` do lucide-react e `Button` do UI
- Adicionar uma funcao `handleDownloadReport()` que:
  - Abre uma nova janela com `window.open()`
  - Monta um HTML com layout de relatorio contendo:
    - Cabecalho com nome "Relatorio de Vendas" e periodo selecionado
    - Tabela de KPIs (Faturamento, Ticket Medio, Total Pedidos, Pedidos/dia)
    - Tabela de faturamento diario (data + valor)
    - Tabela de comparativo semanal
    - Tabela de ranking por item/categoria
  - Usa `@media print` para formatacao e `window.print()` para gerar o PDF
- Adicionar o botao `Baixar Relatorio` ao lado do seletor de periodo no header

### Detalhes tecnicos

- Segue exatamente o padrao de `printOrder.ts` e do fechamento de caixa: `window.open()` + HTML inline + `window.print()`
- Nao precisa de biblioteca externa para PDF
- O conteudo sera formatado em tabelas simples para boa renderizacao na impressao
- Os graficos nao serao incluidos no PDF (nao sao imprimiveis via canvas), mas todos os dados numericos estarao presentes em formato tabular

