
## Situação

Você já tem uma aba aberta no `trendfood.lovable.app` (com fingerprint inicial capturado), mas o Publish tá "Up to date" porque desde o último publish não fizemos nenhuma mudança no código.

## Solução

Faço outra mudança trivial mas real (que mexe no bundle), você publica, e eu volto pra aba já aberta pra confirmar se o card "Nova versão disponível" aparece via `PWAUpdatePrompt`.

**Proposta:** reverter o texto do botão no `VersionCheckCard.tsx` de volta pra **"Verificar atualizações"** (plural). Já tava assim antes — agora restaura. Garante novo hash + deixa o texto no estado original.

## Passos

1. Edito `src/components/dashboard/VersionCheckCard.tsx` linha 62: `"Verificar atualização"` → `"Verificar atualizações"`
2. Você clica Publish (vai destravar)
3. Me avisa "publiquei"
4. Eu volto na aba do `trendfood.lovable.app` (já aberta com fingerprint `index-is6ww1lQ.js`)
5. Confirmo nos console logs: `[VersionPoller] NOVA VERSÃO detectada via index.html`
6. Tiro screenshot pra ver se o card de update aparece na UI
7. Veredito final

## Arquivo afetado
- `src/components/dashboard/VersionCheckCard.tsx` (1 linha)

## Risco
Zero. Restaura o texto original.
