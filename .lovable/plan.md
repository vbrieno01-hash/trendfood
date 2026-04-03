

## Plano: Aviso de Limite de Faturamento Mensal + Cláusula nos Termos

### Visão geral
Permitir que o lojista defina um limite de faturamento mensal (ex: R$ 6.750 para MEI). O sistema exibe uma barra de progresso no Dashboard principal mostrando quanto já faturou no mês vs. o limite. Se não houver valor definido, nada aparece. Também adiciona cláusula de isenção fiscal nos Termos de Uso.

### Mudanças

| Arquivo | Mudança |
|---------|---------|
| `src/components/dashboard/SettingsTab.tsx` | Novo campo "Aviso de Limite de Faturamento" com input numérico, salvo em `organizations.billing_alert_limit` (jsonb no campo existente ou nova coluna) |
| `src/components/dashboard/HomeTab.tsx` | Barra de progresso mostrando faturamento do mês atual vs. limite definido. Alerta visual quando ≥ 80% |
| `src/components/checkout/TermsContent.tsx` | Nova cláusula de responsabilidade fiscal |
| Migração | Adicionar coluna `billing_alert_limit` (numeric, nullable) na tabela `organizations` |

### Detalhes por arquivo

**1. Migração SQL**
```sql
ALTER TABLE public.organizations ADD COLUMN billing_alert_limit numeric DEFAULT NULL;
```

**2. SettingsTab.tsx** — Nova seção "Saúde Fiscal" entre Agendamento e Alterar Senha:
- Input tipo moeda para o lojista digitar o limite (ex: R$ 6.750,00)
- Botão "Salvar" que faz `update` na coluna `billing_alert_limit`
- Texto explicativo: "Defina o limite mensal de faturamento do seu negócio. Você receberá um alerta no painel quando atingir 80% deste valor."

**3. HomeTab.tsx** — Card de alerta condicional (só aparece se `billing_alert_limit > 0`):
- Calcula faturamento do mês atual (pedidos pagos do mês corrente)
- Barra de progresso (`Progress`) com percentual
- Cores: verde (< 60%), amarelo (60-80%), vermelho (≥ 80%)
- Texto: "R$ 5.400 de R$ 6.750 (80%)"
- Se ≥ 80%: badge de alerta "Atenção: próximo do limite definido"

**4. TermsContent.tsx** — Nova seção após "O SERVIÇO":
> "O TrendFood fornece dados de faturamento baseados nos pedidos realizados. A classificação fiscal do estabelecimento (CPF, MEI, ME, etc.) e o cumprimento de seus respectivos limites de faturamento são de responsabilidade exclusiva do usuário contratante."

### Layout do card no HomeTab

```text
┌──────────────────────────────────────────────┐
│  💰 Limite de Faturamento Mensal             │
│                                              │
│  R$ 5.400,00 de R$ 6.750,00                 │
│  [████████████████████░░░░░] 80%             │
│                                              │
│  ⚠️ Atenção: próximo do limite definido      │
└──────────────────────────────────────────────┘
```

### Detalhes técnicos
- 1 migração (1 coluna nova)
- 3 arquivos editados
- Faturamento do mês = pedidos com `paid = true` e `created_at` no mês corrente (reutiliza dados já carregados no HomeTab)
- `useOrganization` e `useAuth` já expõem os dados da org; basta adicionar `billing_alert_limit` ao select

