
## Resposta direta

Não, não vai dar travamento offline. Vou explicar o porquê e o que a gente já blindou contra aquele bug antigo.

## Por que NÃO vai travar como antes

### O que causou o bug antigo
O bug antigo era do **VitePWA + Workbox**: ele cacheava o `index.html` e os assets agressivamente via Service Worker. Quando saía deploy novo, o SW continuava servindo o bundle velho do cache até o usuário fechar **todas** as abas e reabrir — e mesmo assim às vezes ficava preso por dias.

### O que a gente tem hoje (já blindado)

**1. Não tem mais Service Worker cacheando a app**
- O único SW ativo é o `public/sw-push.js`, que **só** serve pra notificações push. Ele não intercepta nenhum fetch, não cacheia HTML, não cacheia assets. Zero interferência com bundle.
- O `main.tsx` roda `cleanupLegacyServiceWorkers()` no boot, que **desregistra qualquer SW que não seja o sw-push** e limpa caches antigos do Workbox/precache/runtime. Então qualquer lojista que ainda tenha resquício do bug antigo é limpo automaticamente na próxima vez que abrir a app.

**2. Detecção de versão via fetch direto, não via SW**
- O `useVersionPoller` faz `fetch('/index.html?ts=...')` com `cache: 'no-store'` e header `cache-control: no-cache`. Vai sempre no servidor, nunca no cache do browser.
- Compara o hash dos `/assets/[hash].js` da versão atual vs a persistida em `localStorage`. Se mudou → card aparece.

**3. Botão "Atualizar agora" usa terra arrasada**
A função `nukeAndReload` faz, em ordem:
1. Desregistra **todos** os SWs (exceto sw-push)
2. Limpa **todos** os caches do browser (`caches.delete` em todas as keys)
3. Recarrega com `window.location.replace(url + '?_v=' + Date.now())` — o `?_v=timestamp` força o browser a buscar `index.html` novo do servidor, ignorando cache HTTP

Isso é o equivalente a "Ctrl+Shift+R" automático. Não tem como ficar preso em bundle antigo.

**4. Modo offline real? Não tem**
A app **nunca** funcionou offline (não é um requisito do TrendFood — todo fluxo precisa de Supabase online). O que existia antes era um SW que tentava cachear pra "performance", e era exatamente isso que travava. Hoje não cacheia nada → não tem como ficar offline com versão velha.

## Resumo

| Bug antigo | Hoje |
|---|---|
| SW Workbox cacheava `index.html` | Sem SW de cache, só push |
| Update dependia do SW detectar `updatefound` | Polling direto de `index.html` (sem SW) |
| "Atualizar" só recarregava (cache HTTP segurava) | `nukeAndReload` limpa SW + caches + cache-bust `?_v=` |
| Lojistas com bundle velho ficavam presos dias | Cleanup automático no boot remove SWs legados |

Tá blindado em 4 camadas. Pode publicar tranquilo.

## Próximos passos

Não precisa mexer em nada. As 2 mudanças do round anterior (`useVersionPoller` + `usePWAUpdate`) já tão prontas. Só publicar e o card vai começar a aparecer pros lojistas conforme eles abrirem a app.

Se quiser **garantia extra** antes de publicar pra todo mundo, posso:
- Adicionar um log mais visível tipo `[PWA] Update detectado: vX → vY` pra você acompanhar no console de algum lojista beta
- Ou nada — o que tá já resolve

Me avisa se quer o log extra ou se pode publicar como tá.
