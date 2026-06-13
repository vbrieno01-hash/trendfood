## Diagnóstico

Verifiquei e **não é problema de rede nem do backend**:

- Lovable Cloud: ativo e respondendo normal.
- Edge Functions: zero erros 5xx nos últimos logs.
- Postgres: sem erros relacionados a `organizations`. Schema com `banner_urls`, `category_layout`, etc. ok.
- `useOrganization` já tem `retry: 3` com backoff, e `UnitPage` já tem tela "Tentar novamente" para falha real de rede.

**O que está acontecendo de verdade:** ontem e hoje publicamos várias mudanças (banners, renovação de plano, página do cliente). Quando um cliente do lojista abre o link da loja com o navegador segurando o `index.html` antigo em cache, esse HTML aponta para arquivos JS (`/assets/xxx-abc123.js`) que **não existem mais** no novo deploy. O navegador falha ao baixar o chunk e cai no nosso handler `recoverFromStaleChunk` em `src/App.tsx`.

O problema é o que esse handler mostra: a tela `RouteFallback` exibe **"Sinal fraco detectado / Sua conexão está instável"**. O cliente lê isso e reporta para o lojista como **"erro de rede, a loja não abre"**. Não é rede — é versão velha em cache. Pior: se o auto-reload já tentou 2x na mesma sessão (`chunk_reload_count >= 2`), o handler desiste e a tela fica travada nesse aviso enganoso.

## O que vou corrigir

### 1. Mensagem honesta no `RouteFallback` (`src/App.tsx`)
Trocar "Sinal fraco detectado / Sua conexão está instável" por **"Atualizando para a nova versão"** com botão **"Recarregar agora"**. Mantém o mesmo visual premium, só corrige o texto que está induzindo o lojista/cliente a achar que é problema de internet.

### 2. Recuperação mais agressiva para a loja pública (`/unidade/:slug` e `/unidade/:slug/mesa/...`)
No `recoverFromStaleChunk`:
- Na **primeira** falha de chunk, já limpar `caches` + Service Workers (exceto `sw-push`) **antes** do reload, com cache-bust `?_v=timestamp` na URL — hoje a limpeza acontece mas o reload é "normal", e em alguns navegadores ainda serve o HTML velho do cache HTTP.
- Aumentar o limite de tentativas de 2 para 3 e reduzir o gap mínimo de 5s para 2s, dando mais uma chance antes de mostrar o fallback.

### 3. Garantir que a loja do cliente nunca registre Service Worker
Auditar rapidamente que nenhuma rota pública (`/unidade/*`, `/avaliar/*`) está registrando `serviceWorker` à toa — só `sw-push.js` para notificações, e mesmo esse não deve rodar para visitante anônimo da loja. Se encontrar registro indevido, removo. Isso evita que um cliente que abriu a loja semana passada fique "preso" com SW antigo.

### 4. Sem mudanças no backend
Nada de migração nem edge function. Backend está saudável; o problema é 100% client-side de cache de bundle.

## Por que isso resolve

Depois do deploy:
- Quem abrir agora pega o bundle novo direto — ok.
- Quem tinha aba aberta com bundle velho: o handler limpa cache+SW na primeira falha e recarrega com cache-bust → cai no bundle novo na hora, sem ver tela de erro.
- Se ainda assim cair no fallback (raro), a mensagem agora diz claramente que é atualização, não "sinal fraco" — e o botão "Recarregar agora" resolve com 1 toque.

## Arquivos afetados
- `src/App.tsx` — texto/visual do `RouteFallback` e lógica do `recoverFromStaleChunk`.
- (Possivelmente) algum hook de registro de SW, se encontrar registro indevido em rota pública.

## Riscos
Mínimos: nenhuma mudança de schema, sem regressão de funcionalidade. Mudanças isoladas em UX de fallback e lógica de reload.