

## Plano: Rodapé no Dashboard, Configuração Fiscal e Alerta Anual MEI

### Resumo
Adicionar rodapé institucional no painel do lojista, permitir que ele informe seu regime tributário (CPF/MEI/ME), e implementar alerta inteligente de limite anual baseado no regime selecionado.

### Mudanças

| # | Arquivo | Mudança |
|---|---------|---------|
| 1 | Migração SQL | Adicionar coluna `tax_regime` (text, nullable) na tabela `organizations` |
| 2 | `src/pages/DashboardPage.tsx` | Rodapé fixo institucional no final do layout |
| 3 | `src/components/dashboard/SettingsTab.tsx` | Nova seção "Configurações Fiscais" com seletor de regime tributário (CPF/MEI/ME) |
| 4 | `src/components/dashboard/HomeTab.tsx` | Alerta de limite anual baseado no regime: MEI = R$ 81.000, CPF = R$ 27.110, ME = R$ 360.000. Aviso ao atingir 85% |

### Detalhes

**1. Migração**
```sql
ALTER TABLE public.organizations ADD COLUMN tax_regime text DEFAULT NULL;
```
Valores aceitos: `'cpf'`, `'mei'`, `'me'` ou `null` (não informado).

**2. Rodapé no DashboardPage.tsx**
Antes do `</div>` final, adicionar:
```text
TrendFood © 2026 - CNPJ 66.067.207/0001-91
O TrendFood é uma ferramenta de gestão. A emissão de documentos fiscais
e o cumprimento de obrigações tributárias são de responsabilidade exclusiva do lojista.
```
Estilo: texto pequeno, centralizado, cor `muted-foreground`, padding top/bottom.

**3. Configurações Fiscais no SettingsTab**
- Nova seção entre "Gestão Fiscal" (billing limit) e "Alterar senha"
- RadioGroup com 3 opções: CPF (Pessoa Física), MEI (Microempreendedor Individual), ME (Microempresa)
- Botão "Salvar" que grava `tax_regime` na tabela `organizations`
- Texto explicativo: "Informe seu regime tributário para receber alertas personalizados de faturamento."

**4. Alerta Anual no HomeTab**
- Abaixo do alerta mensal existente (billing_alert_limit), adicionar alerta anual condicional
- Limites por regime:
  - MEI: R$ 81.000/ano (alerta em 85% = R$ 68.850)
  - CPF: R$ 27.110,40/ano (alerta em 85% = R$ 23.043)
  - ME: R$ 360.000/ano (alerta em 85% = R$ 306.000)
- Calcula faturamento dos últimos 12 meses (pedidos pagos)
- Se atingir 85%, exibe card com aviso: "Atenção: Você atingiu 85% do limite anual do [regime]. Procure seu contador para evitar multas."
- Se `tax_regime` for null, não exibe nada
- Barra de progresso com cores: verde < 70%, amarelo 70-85%, vermelho >= 85%

### Resultado
- 1 migração, 3 arquivos editados
- O lojista configura seu regime uma vez e recebe alertas automáticos tanto mensais (billing_alert_limit manual) quanto anuais (baseado no regime)

