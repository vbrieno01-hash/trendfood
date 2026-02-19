

# Simplificar Painel Admin — Foco no Dono da Plataforma

## Objetivo

Transformar o painel admin de um painel operacional (que mostra dados das lojas) para um painel de **dono do negocio SaaS**, focado em:
- Quantos assinantes pagantes existem
- Quanto ja faturou com assinaturas
- Evolucao de cadastros e conversoes

## O que REMOVER

1. **Feed de Pedidos Recentes** — dados das lojas, nao interessa ao dono da plataforma
2. **Relatorio Mensal por Loja** — faturamento/ticket medio das lojas, nao e relevante
3. **Metricas de pedidos e receita das lojas** nos KPIs (pedidos na plataforma, faturamento total das lojas)
4. **Metricas de itens/pedidos/receita** dentro de cada card de loja
5. **Grafico de pedidos por mes** — substituir por algo mais relevante

## O que MANTER

1. **Lojas Cadastradas** (KPI) — importante saber quantas lojas existem
2. **Grid de Lojas** com filtros, busca, gerenciamento de plano e trial — essencial para administrar
3. **Exportar CSV** de lojas
4. **Configuracoes da Plataforma** (taxas de entrega)
5. **Funcionalidades da Plataforma** (roadmap)

## O que ADICIONAR/ALTERAR nos KPIs

Trocar os 4 KPIs atuais por metricas relevantes para o dono:

1. **Lojas Cadastradas** — total de lojas na plataforma
2. **Assinantes Ativos** — lojas com `subscription_plan` diferente de "free" (pro + enterprise)
3. **MRR (Receita Mensal Recorrente)** — calculo: (qtd pro x R$ 99) + (qtd enterprise x R$ 249)
4. **Taxa de Conversao** — porcentagem de lojas que saíram do plano free para pago

## O que ALTERAR nos Graficos

Trocar os 2 graficos atuais:
1. **Novas Lojas por Mes** — manter (mostra crescimento da base)
2. **MRR por Mes** — novo, mostra evolucao da receita recorrente (substituir grafico de pedidos)

## O que SIMPLIFICAR nos Cards de Loja

Remover as metricas de itens/pedidos/receita da loja. Manter apenas:
- Nome, slug, emoji
- Badge de status (ativo/trial)
- Badge de endereco
- Setup score
- Gerenciamento de plano e trial
- Link para ver loja
- Data de criacao

## Detalhes tecnicos

### Arquivos a modificar

**`src/pages/AdminPage.tsx`:**
- Remover imports de `RecentOrdersFeed` e componente do JSX
- Remover toda a logica de relatorio mensal (state, useEffect, JSX, funcao `generatePdf`, `exportReportCSV`)
- Remover queries de `orders` e `order_items` do useEffect principal (nao precisa mais)
- Remover `rawOrders` state e `orgMap` memo
- Alterar KPIs para: Lojas, Assinantes Ativos, MRR, Taxa de Conversao
- Simplificar `OrgRow` removendo `orders_count` e `total_revenue`
- Remover metricas (grid de 3 colunas) do `StoreCard`
- Remover secao de Relatorio Mensal inteira

**`src/components/admin/GrowthCharts.tsx`:**
- Remover prop `orders` 
- Trocar grafico de "Pedidos por Mes" por "MRR por Mes"
- Receber lista de orgs com plano e created_at para calcular MRR historico

**Arquivos a deletar (nao mais usados):**
- `src/components/admin/RecentOrdersFeed.tsx`

### Calculos

**MRR:**
```
const proCount = orgs.filter(o => o.subscription_plan === 'pro').length;
const enterpriseCount = orgs.filter(o => o.subscription_plan === 'enterprise').length;
const mrr = (proCount * 99) + (enterpriseCount * 249);
```

**Taxa de Conversao:**
```
const paying = orgs.filter(o => o.subscription_plan !== 'free').length;
const rate = orgs.length > 0 ? (paying / orgs.length * 100) : 0;
```

**MRR por Mes (grafico):**
Para cada mes dos ultimos 6, contar quantas lojas tinham plano pago naquele momento (baseado em created_at e plano atual — aproximacao simples).

### Nenhuma migration SQL necessaria
Todos os dados ja existem. Estamos apenas simplificando a interface.
