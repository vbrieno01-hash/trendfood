
# Roadmap de Features + Seção de Status no Painel Admin

## O que o usuário quer

Adicionar ao painel admin uma visão das 5 features solicitadas:
- Onboarding guiado (wizard de configuração inicial)
- Relatório de faturamento mensal em PDF por e-mail
- Suporte via WhatsApp
- Integração com impressora térmica
- Controle de caixa (abertura/fechamento)

## Estratégia: o que implementar agora vs. roadmap visual

Após analisar o codebase, a divisão mais inteligente é:

### Implementar AGORA (funcionais de verdade):

**1. Suporte via WhatsApp** — botão direto no admin e nas lojas que abre conversa no WhatsApp do suporte (número fixo do admin). Implementação imediata, zero backend.

**2. Onboarding Completeness Score** — no card de cada loja, mostrar um indicador de "setup completo" baseado em: tem endereço? tem WhatsApp? tem itens no menu? tem horários? Dá visibilidade ao admin sobre quais lojas precisam de atenção.

**3. Controle de Caixa (abertura/fechamento)** — nova tabela `cash_sessions` no banco + nova aba no dashboard das lojas para registrar abertura/fechamento de caixa com saldo inicial e final.

### Mostrar como ROADMAP visual no admin (planejadas):

**4. Relatório PDF por e-mail** — card no roadmap com status "Em desenvolvimento"

**5. Integração impressora térmica** — já existe código de impressão no sistema (`src/lib/printOrder.ts`), então mostrar como "Beta" com link para a funcionalidade existente

---

## Mudanças técnicas detalhadas

### 1. Nova seção "Roadmap & Features" no AdminPage

Adicionar abaixo do grid de lojas uma seção com cards de features, cada um com:
- Ícone representativo
- Nome e descrição da feature
- Badge de status: "Disponivel" (verde), "Beta" (azul), "Em breve" (âmbar), "Planejado" (cinza)
- Para features "Disponível": link direto para onde acessar

```text
┌─────────────────────────────────────┐  ┌─────────────────────────────────────┐
│  💬  Suporte WhatsApp  [Disponível] │  │  🖨  Impressora Térmica  [Beta]     │
│  Acesse o suporte direto pelo       │  │  Impressão direta para impressoras  │
│  WhatsApp em qualquer tela          │  │  térmicas de 80mm via dashboard     │
│  [Abrir WhatsApp]                   │  │  [Ver documentação]                 │
└─────────────────────────────────────┘  └─────────────────────────────────────┘
┌─────────────────────────────────────┐  ┌─────────────────────────────────────┐
│  🎯  Onboarding Wizard  [Em breve]  │  │  💰  Controle de Caixa  [Em breve] │
│  Passo a passo guiado para novas    │  │  Abertura/fechamento com saldo      │
│  lojas configurarem em minutos      │  │  inicial, sangrias e fechamento     │
└─────────────────────────────────────┘  └─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  📊  Relatório PDF Mensal  [Planej] │
│  Relatório automático por e-mail    │
│  com faturamento do mês             │
└─────────────────────────────────────┘
```

### 2. Botão de WhatsApp Suporte no header do admin

No header do `AdminPage`, adicionar um botão de acesso rápido com link para WhatsApp — o admin preenche o número de suporte no código.

### 3. Onboarding Score nos cards de loja

Adicionar no `StoreCard` uma mini barra de progresso de "setup" baseada em quantos dos 4 critérios a loja completou:
- Tem endereço configurado? +25%
- Tem WhatsApp cadastrado? +25%
- Tem pelo menos 1 item no cardápio? +25%
- Tem horários configurados? +25%

Para isso, precisamos buscar `whatsapp` e `business_hours` nas organizations também (já existem no schema).

---

## Arquivo modificado

| Arquivo | Mudança |
|---|---|
| `src/pages/AdminPage.tsx` | Adicionar seção Roadmap de Features + onboarding score nos cards + botão WhatsApp no header |

---

## Detalhes de implementação

### OrgRow — ampliar interface
Adicionar campos `whatsapp` e `business_hours` para calcular o score de setup:
```ts
interface OrgRow {
  // ... campos existentes
  whatsapp: string | null;
  business_hours: object | null;
}
```

### SetupScore component (novo, dentro do arquivo)
```tsx
function SetupScore({ org }: { org: OrgRow }) {
  const checks = [
    !!org.store_address,
    !!org.whatsapp,
    org.menu_items_count > 0,
    !!org.business_hours,
  ];
  const score = checks.filter(Boolean).length; // 0-4
  const pct = score * 25;
  return (
    <div className="px-5 pb-3 space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Setup</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
```

### FeatureRoadmap section (novo, dentro do arquivo)
Array estático de features com ícone, título, descrição e status. Renderizado como grid 2x3 de cards abaixo das lojas. Nenhuma chamada de banco necessária — é conteúdo editorial do admin.

### Query update
Adicionar `whatsapp, business_hours` ao SELECT de organizations já existente.
