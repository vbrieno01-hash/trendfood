

## Objetivo

Painel no Admin mostrando qual versão cada loja está rodando, capturada via heartbeat quando o lojista abre o dashboard. Permite identificar lojas com cache antigo / SW preso de forma proativa.

## Arquitetura

```text
Lojista abre /dashboard
        ↓
useVersionHeartbeat (1x por sessão + a cada 30min)
        ↓
UPSERT em store_version_heartbeat
   (org_id, version, last_seen_at, user_agent, is_standalone)
        ↓
Admin → aba "Versões" → SELECT com JOIN organizations
        ↓
Tabela: Loja | Versão | Última vez online | Plataforma | Status
```

## Frente 1 — Banco

Migração SQL nova:

- Tabela `store_version_heartbeat`:
  - `id uuid pk`
  - `organization_id uuid not null unique` (1 linha por loja, sempre o mais recente)
  - `version text not null` (ex: `2025.04.17.14.30`)
  - `user_agent text`
  - `is_standalone boolean` (PWA instalado vs aba navegador)
  - `last_seen_at timestamptz default now()`
  - `created_at timestamptz default now()`
- RLS:
  - INSERT/UPDATE: dono da org (`auth.uid() = org.user_id`)
  - SELECT: só admin (`has_role(auth.uid(), 'admin')`)
  - DELETE: só admin
- Índice em `last_seen_at desc` para ordenação rápida

## Frente 2 — Captura (lado do lojista)

Novo hook `src/hooks/useVersionHeartbeat.ts`:
- Roda no `DashboardPage` mount
- Lê `__BUILD_VERSION__` (já existe via Vite define)
- Detecta `is_standalone` via `window.matchMedia('(display-mode: standalone)').matches`
- Faz `upsert` em `store_version_heartbeat` por `organization_id`
- Re-envia a cada 30 min se a aba ficar aberta
- Skip se preview/iframe (mesma regra do PWA hook)

## Frente 3 — Painel Admin

Nova aba no `AdminPage`: **"Versões"** (ícone `Activity`)

Componente `src/components/admin/StoreVersionsTab.tsx`:
- Query: `store_version_heartbeat` JOIN `organizations` (name, slug, plan, owner email)
- Tabela com colunas:
  - **Loja** (nome + slug)
  - **Versão atual** (font-mono, badge colorida)
  - **Última atividade** (formato relativo: "há 5 min", "há 2 dias")
  - **Plataforma** (badge: 📱 PWA / 🌐 Navegador)
  - **Status de versão** (badge):
    - 🟢 Atualizada (igual à versão mais recente vista)
    - 🟡 Atrasada (1-3 versões atrás)
    - 🔴 Desatualizada (>3 versões ou >7 dias offline)
- Filtros no topo:
  - Busca por nome de loja
  - Filtro "Só desatualizadas"
  - Filtro "Só PWA instalado"
- Stats cards no topo:
  - Total de lojas com heartbeat
  - % atualizadas
  - Quantas estão com versão mais antiga que 7 dias
- Botão "Exportar CSV" pra você ter o relatório

A versão "mais recente" é calculada client-side: `max(version)` de todos os heartbeats (ordenação lexicográfica funciona porque o formato é `YYYY.MM.DD.HH.mm`).

## Frente 4 — Integração

- `DashboardPage.tsx`: importar e chamar `useVersionHeartbeat()` no topo
- `AdminPage.tsx`: adicionar nova `TabsTrigger` "Versões" + `TabsContent` com `<StoreVersionsTab />`

## Arquivos novos
- `supabase/migrations/<timestamp>_store_version_heartbeat.sql`
- `src/hooks/useVersionHeartbeat.ts`
- `src/components/admin/StoreVersionsTab.tsx`

## Arquivos editados
- `src/pages/DashboardPage.tsx` (1 linha + import)
- `src/pages/AdminPage.tsx` (+1 aba)

## O que NÃO vou mexer
- Lógica de PWA update existente
- Card "Versão do sistema" em Configurações (continua igual)
- RLS de outras tabelas

## Risco
Baixo. Tabela nova isolada, RLS restritiva (admin-only no SELECT), heartbeat fail-silent (se der erro não bloqueia nada). Volume mínimo (1 upsert por loja/sessão).

## Resultado esperado
Você abre Admin → Versões e vê em segundos:
- "Caha e Alho rodando v2025.04.10 — 7 dias atrás" → manda mensagem pra ela
- "Loja X em PWA standalone com versão de ontem" → tudo certo
- Métrica geral: "82% das lojas estão na última versão"

