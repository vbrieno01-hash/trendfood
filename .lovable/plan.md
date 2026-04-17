

## Diagnóstico (problemas reais encontrados)

Confirmei direto no banco: **`store_version_heartbeat` tem 0 linhas**. Olhei o código e achei **3 causas combinadas**:

### Causa 1 — `__BUILD_VERSION__` não existe em runtime
No `vite.config.ts` (linha 16) o `define` injeta `__BUILD_VERSION__` **só no build de produção via Vite**. Mas quando o app roda no domínio publicado (`trendfood.lovable.app`), o lojista logado pode estar:
- Em sessão com bundle antigo (sem o código do heartbeat ainda)
- Ou o `define` nem aplicou na build atual em produção

Resultado: o hook tenta enviar `version: "unknown"` ou nem dispara.

### Causa 2 — Deploy ainda não chegou nas lojas
O heartbeat foi adicionado **agora há pouco**. As lojas que tão abertas com sessão ativa **continuam rodando o bundle antigo sem o hook**. Só vão começar a enviar heartbeat depois que **atualizarem para a versão nova** — exatamente o problema circular que a gente tá tentando resolver.

### Causa 3 — Você tá testando no Admin (`/admin`), não no Dashboard
O hook `useVersionHeartbeat` só roda dentro do `DashboardPage.tsx` (linha 75). Quando você acessa só `/admin`, **nem sua própria sessão envia heartbeat**. Por isso aparece 0.

### Causa 4 (menor) — RLS validada e correta
Política de UPSERT exige `auth.uid() = organizations.user_id`. Tá certo, mas se uma loja tem owner diferente do usuário logado (ex: você no admin "olhando" loja de outro), o upsert falha silenciosamente. Não é o problema principal.

## Solução

### Frente 1 — Garantir que o hook rode em mais lugares
Adicionar `useVersionHeartbeat` também em:
- `AdminPage.tsx` — pra você mesmo aparecer na lista quando acessa o admin
- `KitchenPage.tsx`, `WaiterPage.tsx`, `CourierPage.tsx` — telas que ficam abertas em tablet/celular dedicado nas lojas (caso clássico de PWA "preso")

Assim qualquer tela interna de lojista alimenta o heartbeat.

### Frente 2 — Fallback robusto pro `__BUILD_VERSION__`
No hook, se `__BUILD_VERSION__` for `"unknown"` ou undefined, gerar um fallback baseado no hash do bundle JS atual (extraído do `<script src="/assets/index-XXXXX.js">` do DOM). Assim **sempre** envia algo identificável, mesmo se o define não tiver aplicado.

```ts
function getBuildVersion(): string {
  if (typeof __BUILD_VERSION__ !== "undefined" && __BUILD_VERSION__ !== "unknown") {
    return __BUILD_VERSION__;
  }
  // Fallback: extrai hash do bundle do DOM
  const script = document.querySelector('script[src*="/assets/index-"]') as HTMLScriptElement;
  const match = script?.src.match(/index-([^.]+)\.js/);
  return match ? `hash-${match[1]}` : "unknown";
}
```

### Frente 3 — Logs de debug visíveis
Trocar `console.info` por `console.log` nos pontos críticos do heartbeat e logar **antes** de enviar (qual versão, qual org_id) e **depois** (sucesso ou erro completo). Hoje os logs são muito tímidos e sumidos.

### Frente 4 — Botão "Forçar heartbeat agora" no Admin
Adicionar um botão pequeno no painel `StoreVersionsTab` que **força sua própria sessão** a enviar um heartbeat na hora, pra você poder validar o pipeline ponta-a-ponta sem precisar abrir outra aba/conta. Aparece sua loja na lista → confirma que tá funcionando.

### Frente 5 — Mensagem mais explicativa no estado vazio
Trocar o texto "Nenhum heartbeat encontrado" por algo tipo:
> "Nenhuma loja com a versão nova ainda. Heartbeats só aparecem depois que cada loja atualizar pro código com tracking. Lojas com PWA standalone podem demorar até 24h pra revalidar — o card de update agressivo (frente anterior) acelera isso."

## Arquivos afetados

- `src/hooks/useVersionHeartbeat.ts` — fallback de versão + logs melhores
- `src/pages/AdminPage.tsx` — adicionar `useVersionHeartbeat(currentOrg?.id)` + botão "Forçar heartbeat"
- `src/pages/KitchenPage.tsx`, `WaiterPage.tsx`, `CourierPage.tsx` — adicionar hook
- `src/components/admin/StoreVersionsTab.tsx` — botão de teste manual + mensagem vazia mais explicativa

## O que NÃO vou mexer

- Tabela e RLS (estão corretas)
- vite.config.ts (`__BUILD_VERSION__` continua igual, só adiciona fallback)
- Lógica do PWA poller / update prompt

## Resultado esperado

Imediatamente após esse deploy:
1. Você abre `/admin` → seu próprio heartbeat já aparece na lista
2. Clica em "Forçar heartbeat" → confirma o pipeline funcionando em segundos
3. Lojas que abrirem qualquer tela interna (Dashboard/Cozinha/Garçom/Motoboy) começam a aparecer
4. Console do navegador mostra log claro: `[heartbeat] enviando v2025.04.17.xx pra org abc-123` → `[heartbeat] OK`

## Risco

Mínimo. Só adiciona o hook em mais páginas e melhora observabilidade. Sem mudança de schema, sem mudança de RLS.

