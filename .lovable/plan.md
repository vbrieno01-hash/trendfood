
## Diagnóstico da causa raiz

O `useVersionPoller` baixa `/index.html`, extrai os paths `/assets/[hash].js` e compara com o snapshot inicial. **Mas tem um problema fatal:**

### Bug #1 — Cleanup de SWs apaga o cache do `index.html`
Em `main.tsx`, no primeiro load **após o deploy**, o cleanup roda `caches.delete(...)` em qualquer cache que contenha "workbox/precache/runtime". Isso ok. Mas o `fetch('/index.html?ts=...')` no poller é **no-store** — então o snapshot inicial captura o HTML **novo** (já atualizado). A partir daí, qualquer comparação dá igual → nunca detecta mudança até o **próximo** deploy.

Resultado: o lojista que já abriu a app **antes do deploy** capturou o HTML antigo no snapshot, mas só vê o card se recarregar a página naquele intervalo de 60s. Se a aba estava fechada e ele abriu **depois** do deploy → snapshot já é o novo → card nunca aparece.

### Bug #2 — Sem `__BUILD_VERSION__` exposto publicamente
Não existe um endpoint tipo `/version.json` com o build atual. Toda a detecção depende de comparar hashes de assets do `index.html`. Frágil.

### Bug #3 — Snooze persiste entre deploys
O `localStorage` do `pwa_snooze_until` não é limpo quando muda a versão. Se o lojista clicou "mais tarde" semana passada e o TTL ainda tá valendo, o card simplesmente não aparece nesta versão também.

### Bug #4 — Card existe mas usuário precisa abrir a aba certa
`<PWAUpdatePrompt />` está no `App.tsx` (✅ global), mas como o poller só dispara em foco/visibility e a cada 60s, lojistas com a aba sempre aberta no Dashboard talvez nunca recebam o sinal se o snapshot já é o novo.

---

## Solução: simplificar drasticamente

O user pediu exatamente isso: **"mostra o card e ao clicar atualiza em tempo real"**. Vou trocar a detecção frágil por algo determinístico:

### Mudança #1 — Endpoint `/version.json` versionado a cada build
- `vite.config.ts`: gerar `public/version.json` no build com `{ version: BUILD_VERSION, builtAt: ISO }`
- Como isso não é trivial sem plugin custom, alternativa mais simples: **usar o próprio `__BUILD_VERSION__` injetado**, salvar no `localStorage` do client no primeiro mount, e o poller compara `__BUILD_VERSION__` atual vs último visto

Espera — isso não funciona porque `__BUILD_VERSION__` é estático no bundle. Se o user já tem o bundle antigo carregado, ele continua reportando a versão antiga.

**Solução real:** poller faz fetch de `/index.html` + extrai um marcador estável (não os hashes dos chunks, que podem mudar por motivos não-funcionais), **mas** persiste o snapshot inicial em `localStorage` com timestamp. Se o snapshot persistido tem mais de X minutos, considera "antigo" e qualquer mudança dispara o card. Isso resolve o caso do lojista que abriu a app **depois** do deploy (snapshot novo) — não precisa resolver, ele já tá na versão nova!

O verdadeiro problema então é **só** os bugs #1 e #3. Vou focar neles:

### Plano final (3 mudanças cirúrgicas)

**1. `usePWAUpdate.ts` — limpar snooze ao mudar de versão**
- Persistir o fingerprint visto pela última vez no `localStorage`
- Se o `serverHasNewVersion` dispara com fingerprint diferente do snooze salvo → ignorar o snooze e mostrar o card
- Resultado: cada nova versão reseta o "mais tarde"

**2. `useVersionPoller.ts` — disparo imediato + log claro**
- Hoje captura snapshot inicial e só compara depois. Vou adicionar: se já existe snapshot persistido em `localStorage` de sessão anterior, comparar imediatamente no mount (sem esperar 60s ou foco)
- Persistir o snapshot inicial em `localStorage` com chave `pwa_last_seen_fp`
- Comparar `pwa_last_seen_fp` (sessão anterior) vs HTML atual logo no boot → se mudou, dispara `hasNewVersion=true` na hora
- Manter polling de 60s pra capturar deploys com app aberto

**3. `PWAUpdatePrompt.tsx` — botão "Atualizar agora" garantido**
- Já chama `nukeAndReload` (limpa SWs + caches + reload). Tá ok.
- Adicionar cache-bust no reload: `window.location.href = window.location.pathname + '?v=' + Date.now()` em vez de `reload()` puro, pra eliminar 100% chance de cache do navegador segurar bundle antigo

---

## Resumo do comportamento pós-fix

| Cenário | Comportamento |
|---|---|
| Lojista com app aberto durante deploy | Card aparece em até 60s (poll) ou ao trocar de aba (visibility) |
| Lojista abre app **depois** do deploy | Snapshot novo capturado, sem card (correto — já tá na versão nova) |
| Lojista abre app dias depois (snapshot antigo no localStorage) | **Card aparece imediatamente no boot** (novo!) |
| Lojista clicou "mais tarde" no deploy anterior | **Snooze é resetado** ao detectar fingerprint diferente |
| Clica "Atualizar agora" | Limpa SWs + caches + recarrega com `?v=timestamp` (cache-bust total) |

## Validação

Após implementar:
1. Bumpar uma string qualquer pra forçar novo hash de bundle
2. Publicar
3. Abrir a app em aba anônima (limpa) → não deve aparecer card
4. Abrir DevTools → Application → LocalStorage → setar `pwa_last_seen_fp` pra um valor fake → recarregar → card deve aparecer na hora
5. Clicar "Atualizar agora" → URL deve ganhar `?v=timestamp` e bundle novo deve carregar

## Arquivos a modificar

- `src/hooks/useVersionPoller.ts` — persistir fingerprint + check imediato no boot
- `src/hooks/usePWAUpdate.ts` — resetar snooze quando fingerprint muda
- `src/components/PWAUpdatePrompt.tsx` — pequeno ajuste de UX (opcional)
- Função `nukeAndReload` já existe e está boa, só trocar `reload()` por redirect com `?v=`

Sem mudança no `vite.config.ts`, sem novo endpoint, sem service worker novo. Mudança mínima e cirúrgica.
