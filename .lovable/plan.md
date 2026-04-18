
## Não consigo publicar pra você

Publish é ação manual sua — botão no canto superior direito do editor (desktop) ou menu "..." no mobile. Não tenho ferramenta pra disparar deploy.

## O que faço de útil agora

Pra garantir que **quando você publicar** o teste seja conclusivo, posso:

1. **Adicionar um marcador visível** (ex: data/hora do build no rodapé do dashboard ou no `VersionCheckCard`) — assim você confirma a olho qual versão tá rodando, sem depender só de hash de bundle
2. **Reforçar os logs** do `useVersionPoller` pra ficar impossível de errar:
   - `[VersionPoller] init → fp inicial: xxx`
   - `[VersionPoller] tick (60s) → fp atual: yyy | mudou: true/false`
   - `[VersionPoller] visibility/focus → fp atual: yyy | mudou: true/false`
   - `[VersionPoller] NOVA VERSÃO detectada` (já existe)

## Roteiro de teste (pra você executar pós-publish)

1. Abrir loja real no domínio publicado (`trendfood.lovable.app` ou domínio do lojista) — **não** funciona em `id-preview` nem dentro do iframe do editor (poller é desativado nesses casos por design)
2. Abrir DevTools → Console → filtrar por `VersionPoller`
3. Confirmar log inicial: `[VersionPoller] fingerprint inicial: ...`
4. Você clicar em **Publish** no editor
5. Em até 60s (ou imediato se trocar de aba e voltar) o console mostra: `[VersionPoller] NOVA VERSÃO detectada via index.html`
6. Card "Nova versão disponível" aparece no canto

## Edge cases que valem checar

- Se a aba estiver **em background** o navegador pode pausar o `setInterval` — o `visibilitychange` cobre isso ao voltar pra aba
- Se o lojista tiver **SW antigo do Workbox preso**, a primeira abertura pós-deploy roda o cleanup do `main.tsx` e dá 1 reload — só depois disso o poller começa a funcionar limpo

## Plano de mudança (mínimo, só pra facilitar o teste)

### Frente única — `src/hooks/useVersionPoller.ts`
Adicionar 2 logs extras no `useEffect`:
- Log a cada tick do `setInterval` (mostrando fp atual vs inicial)
- Log no handler de `visibility/focus`

Sem mudança de comportamento, só observabilidade.

## Arquivos afetados
- `src/hooks/useVersionPoller.ts` (apenas `console.info` adicionais)

## Risco
Zero. Só logs.

## O que NÃO faço
- Não publico (não tenho permissão/ferramenta)
- Não mudo lógica do poller (já foi corrigida na rodada anterior)
- Não adiciono badge visual sem você pedir explicitamente
