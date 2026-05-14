# Por que está tudo lento — diagnóstico e plano

## O que eu já verifiquei

- **Backend Cloud:** está saudável, sem incidente.
- **Edge Functions (1h):** rodando com latência alta — média de **1,1s** nas chamadas 200 e **uma função em 5,2s de média (pico 10,3s)**. Isso por si só já torna qualquer ação dependente dela arrastada.
- **Console do preview:** apareceu `Failed to fetch dynamically imported module: AuthPage.tsx` — sintoma clássico de **chunk antigo** do PWA tentando baixar bundle que não existe mais (acontece quando a gente publica versões novas seguidas, como hoje).
- **Lojistas reclamando há dias** + tudo lento (inclusive landing) → não é bug pontual, é **gargalo de capacidade + frontend pesado**.

## Causas prováveis (em ordem de impacto)

1. **Instância da Lovable Cloud subdimensionada** para o volume atual (várias lojas, KDS realtime, webhooks WhatsApp/MP, push, iFood polling). Quando o banco satura, **toda** chamada fica lenta — landing inclusive, porque o `index.html` e SEO data passam pelo edge.
2. **Edge functions pesadas** (uma com 5s de média) bloqueando workers e enfileirando as outras.
3. **Bundle frontend grande** + chunks antigos servidos do cache do PWA causando recarregamentos e telas em branco.
4. **Realtime + SupportChatWidget (SSE)** abertos em todas as rotas internas → conexões persistentes consumindo recursos.
5. **Queries sem índice / N+1** em hooks que rodam no boot (useAuth, useOrganization, useOrders).

## Plano em 3 frentes

### 1. Quick wins (hoje, sem mexer em infra)
- Identificar a função edge que está em **5s/10s de média** e otimizar (provavelmente `ai-bot`, `lucas-ai` ou um webhook de WhatsApp/iFood). Aplicar padrão **job assíncrono**: aceita request, grava job, retorna em <200ms, processa em `EdgeRuntime.waitUntil`.
- Reduzir o `staleTime` agressivo onde não precisa ser realtime — hoje vários hooks têm `staleTime: 0` (KDS, courier) o que dispara refetch a cada foco/visibility. Manter 0 só onde é crítico.
- Forçar **cleanup do PWA antigo** bumpando o `CLEANUP_FLAG` em `main.tsx` (de `sw_cleanup_v2` → `v3`) pra todo cliente limpar SW e cache na próxima abertura — resolve o "chunk velho" geral.
- Restringir o `SupportChatWidget` a abrir SSE só sob demanda (quando o usuário clica), não no mount.

### 2. Otimizações de carregamento (esta semana)
- Audit do bundle: separar dependências pesadas (recharts, framer-motion, lucide) em chunks dedicados (já parcialmente feito em `vite.config.ts`).
- Lazy-load do `AdminPage` filhos (AIBotAdminTab, GrowthCharts, etc) — hoje algumas tabs carregam tudo de uma.
- Adicionar índices no banco para colunas usadas em filtros frequentes (`orders.org_id+status+created_at`, `whatsapp_outbox.status`).
- Reduzir SELECT * em hooks principais para colunas necessárias.

### 3. Capacidade de infra (recomendação ao dono da plataforma)
- A instância da Lovable Cloud que roda o backend **pode estar pequena** para o tráfego atual. Como vários lojistas relatam lentidão simultânea, isso é forte indício de saturação.
- **Ação:** abrir o painel da plataforma → **Backend (Lovable Cloud)** → **Advanced settings** → **Upgrade instance** para um tamanho maior. Isso aumenta CPU, RAM e I/O do banco, e melhora todas as queries e edge functions de uma vez.
- Custo: aumenta o uso do Cloud no billing; ganho: estabilidade pra dezenas de lojas em horário de pico.
- Doc oficial: https://docs.lovable.dev/features/cloud#advanced-settings-upgrade-instance

## O que eu vou implementar quando você aprovar

1. Bumpar flag de cleanup do SW (resolve cache velho geral imediatamente).
2. Identificar via logs qual edge function é a de 5s e refatorar pra job assíncrono.
3. Tornar o SupportChatWidget lazy/sob demanda.
4. Revisar `staleTime` dos hooks pesados (orders, courier).
5. Criar migração com índices nas tabelas mais consultadas.

A frente **3 (upgrade da instância)** depende de você abrir o painel — eu não consigo fazer isso de dentro do código.

## Pergunta antes de começar

Quer que eu execute as 5 ações da seção "vou implementar" de uma vez, ou prefere ir uma por uma medindo o ganho? Se topar tudo junto, mando em sequência e te aviso o que rodar.
