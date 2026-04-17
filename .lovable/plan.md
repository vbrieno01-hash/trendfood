

## Diagnóstico

O card de atualização do PWA não aparece porque a **lógica é passiva demais**: ele só mostra quando o `vite-plugin-pwa` detecta um novo Service Worker baixado E processado. Em produção real isso falha por vários motivos:

**Causas confirmadas no código:**

1. **`registerType: "prompt"` (vite.config.ts:29)** — O SW novo só é detectado quando o navegador **decide** revalidar. Em PWA standalone instalado, isso pode levar **horas ou dias** (HTTP cache do `sw.js` segura).

2. **Polling depende do `registrationRef`** (`usePWAUpdate.ts`) — só começa a rodar depois que `onRegisteredSW` dispara. Se o SW tá "stuck" (caso clássico da Caha e Alho), o ref nunca preenche e o polling nunca roda.

3. **Sem detecção de versão server-side** — o sistema confia 100% no navegador comparar SW antigo vs novo. Não tem checagem direta tipo "fetch /version.json e compara com `__BUILD_VERSION__`".

4. **`needRefresh` pode nunca virar `true`** mesmo com nova versão publicada se o navegador serviu `sw.js` do cache HTTP.

5. **Heartbeat tá vazio** (confirmei agora: 0 lojas registradas) — ou seja, nem o tracking novo capturou versão de ninguém ainda, sinal de que as lojas tão com SW preso na versão antiga (sem o código do heartbeat).

## Solução — Detecção ativa por versão

Adicionar um **canal independente** que **não depende do Service Worker** pra detectar atualização. Usa fetch HTTP direto comparando `__BUILD_VERSION__` local vs publicado.

### Frente 1 — Endpoint de versão estática

Gerar `public/version.json` no build com `{ "version": "2025.04.17.23.45" }`. Vite serve estaticamente, navegador pode buscar **bypassing SW cache** via `cache: 'no-store'`.

Como `public/version.json` não pode ser gerado dinamicamente, vou usar uma alternativa mais robusta: **buscar o próprio `index.html`** com `cache: no-store` e extrair o hash do bundle JS principal (que muda a cada build). Mudança de hash = nova versão.

### Frente 2 — Hook `useVersionPoller` (novo)

- A cada 60s, fetch `/index.html` com `cache: 'no-store'`
- Extrai o hash do `<script type="module" src="/assets/index-XXXXX.js">`
- Compara com hash capturado no primeiro mount
- Se mudou → seta `serverHasNewVersion = true`
- Roda em paralelo ao SW polling existente
- Skip preview/iframe (mesma regra)

### Frente 3 — Integrar no `usePWAUpdate`

Mudar a condição que ativa o card:
```ts
// antes: if (!needRefresh) return;
// depois: if (!needRefresh && !serverHasNewVersion) return;
```

Assim o card aparece se **qualquer um dos dois** sinais disparar — SW detectou OU o servidor tem versão diferente. Fim do "card que nunca aparece".

### Frente 4 — Botão "Atualizar agora" mais agressivo

Quando o usuário clica em atualizar:
1. Tenta `updateServiceWorker(true)` (caminho atual)
2. Se em 3s não recarregou → desregistra todos os SWs + limpa todas as caches + `location.reload(true)`
3. Garante que mesmo SW preso é resolvido

### Frente 5 — Card no canto: garantir z-index e posição

`PWAUpdatePrompt.tsx` já tem `z-[100]` e `fixed bottom-4 right-4` — visualmente tá ok. O problema era 100% lógica de detecção, não posição.

## Arquivos afetados

- `src/hooks/usePWAUpdate.ts` — adicionar sinal `serverHasNewVersion` e `handleUpdate` mais agressivo
- `src/hooks/useVersionPoller.ts` — **novo**, faz polling do index.html
- (sem migração, sem mudança no banco, sem novo build script)

## O que NÃO vou mexer

- VitePWA config (continua `registerType: "prompt"`)
- Componente visual `PWAUpdatePrompt.tsx` (visual já tá bom)
- Heartbeat e painel admin (já entregues, vão começar a popular conforme lojas atualizarem)
- `VersionCheckCard` em Configurações (continua igual, é o backup manual)

## Resultado esperado

- Você publica nova versão → em até 60s as lojas com aba aberta veem o card
- PWA standalone que tava com SW preso: card aparece pelo canal independente, botão "Atualizar agora" força reload limpando tudo
- Card volta a funcionar como deveria pra **todas as lojas**, não importa o estado do SW

## Risco

Baixo. Adiciona um canal extra de detecção, não remove o existente. Fail-silent: se o fetch falhar, não bloqueia nada (continua o comportamento atual). Polling de 60s no `index.html` é leve (resposta de ~5KB com `no-store`).

