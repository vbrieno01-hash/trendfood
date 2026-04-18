
## Resposta direta

**Recomendação: Opção 1 — Remover o cache do service worker, manter manifest + push.**

### Por quê

Seu sistema é um **SaaS operacional ao vivo** (cozinha imprimindo, garçom registrando pedido, motoboy entregando). O custo de uma loja "travada" numa versão antiga é altíssimo: bug não some, recurso novo não chega, e você fica refém de pedir pra cada lojista limpar cache manualmente.

Cache offline do Workbox em PWA seria útil só se as lojas operassem **sem internet** — mas o sistema **não funciona offline de qualquer jeito** (tudo depende do Supabase em tempo real: pedidos, RLS, prints, push, status). Ou seja, você paga o **custo** do cache (lojas travadas) sem colher o **benefício** (offline real).

### O que muda na prática

| Item | Hoje | Depois |
|---|---|---|
| Instalar como app (Android/iOS/desktop) | ✅ Funciona | ✅ Continua igual |
| Notificações push (novo pedido) | ✅ Funciona | ✅ Continua igual |
| Atualização ao publicar | ❌ Trava por dias | ✅ Chega em segundos |
| Funcionar 100% offline | ❌ Não funciona mesmo | ❌ Continua não funcionando |
| Velocidade de abrir o app | Cache local (rápido) | HTTP + cache do navegador (rápido também) |

Resumo: **você não perde nada que realmente usa, e ganha controle total de versão.**

## Plano de implementação

### Frente 1 — `vite.config.ts`
- Remover `VitePWA` por completo
- Manter `manifest.json` em `public/` (instalabilidade preservada)
- Manter `__BUILD_VERSION__` define (heartbeat continua funcionando)

### Frente 2 — `index.html`
- Adicionar `<link rel="manifest" href="/manifest.json">` (substitui o que o plugin injetava)
- Adicionar meta tags de tema/standalone que o plugin gerava

### Frente 3 — `public/manifest.json` (novo)
- Mover config de manifest do `vite.config.ts` pra arquivo estático
- `name`, `short_name`, `icons`, `display: standalone`, `theme_color`, `start_url`

### Frente 4 — `src/main.tsx` — auto-cleanup global
- **Sempre** (não só preview/iframe) desregistrar SWs antigos do Workbox e limpar caches `workbox-*` na primeira carga depois do deploy
- Mantém `/sw-push.js` registrado separadamente (via `usePushSubscription`)
- Usa flag em `localStorage` (`sw_cleanup_v2`) pra rodar só uma vez por cliente

### Frente 5 — `src/hooks/usePWAUpdate.ts`
- Simplificar: remover dependência do `virtual:pwa-register` (que vai sumir junto com o plugin)
- Manter o `useVersionPoller` (já existe e funciona via fetch direto do `index.html`)
- Card de "atualizar agora" passa a chamar **só** `nukeAndReload()` (limpa caches HTTP via `location.reload()` + remove qualquer SW residual)

### Frente 6 — `src/components/PWAUpdatePrompt.tsx`
- Sem mudança visual; só consome o hook simplificado

### Frente 7 — `public/sw-push.js`
- Sem mudança. Continua fazendo só notificação push (não mexe em cache de páginas).

## Arquivos afetados
- `vite.config.ts` (remover VitePWA)
- `index.html` (adicionar `<link rel="manifest">` + meta tags)
- `public/manifest.json` (novo)
- `src/main.tsx` (cleanup global de SWs antigos)
- `src/hooks/usePWAUpdate.ts` (simplificar, remover import virtual)
- `package.json` (remover `vite-plugin-pwa` da dep)

## O que NÃO muda
- Heartbeat e painel admin de versões
- `/sw-push.js` e fluxo de push notification
- Manifest (instalabilidade preservada)
- Lógica de business

## Resultado esperado
- Próximo publish → todas as lojas com aba aberta veem o card em até 60s (via `useVersionPoller`)
- Lojas com SW antigo do Workbox: o cleanup do `main.tsx` desregistra na próxima abertura, fim do "preso"
- Você publica e em poucos minutos a frota inteira tá na versão nova

## Risco
Médio-baixo. A primeira abertura pós-deploy vai disparar 1 reload extra em lojas com SW antigo (auto-heal). Depois disso, nunca mais trava.
