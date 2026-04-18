
## Situação

Você quis publicar uma mudança trivial pra eu testar a detecção de nova versão, mas o publish tá falhando ("não tá dando pra publicar"). A imagem que você mandou mostra o botão "Up to date" — ou seja, o Lovable acha que não há nada novo pra publicar.

## Por que isso acontece

O botão Publish vira "Up to date" quando **não há diff** entre o último commit publicado e o estado atual do código. Como você tentou fazer uma "mudança trivial" (provavelmente um espaço em branco), três coisas podem ter acontecido:

1. A mudança foi revertida/desfeita antes de salvar
2. A mudança não gerou commit (espaço em branco em alguns arquivos é ignorado)
3. O publish anterior já incluiu essa mudança e agora não há mais diff

## Solução: forçar uma mudança real e visível

Pra garantir que o bundle Vite gere novos hashes nos assets (`index-XXX.js` / `index-XXX.css`), preciso fazer uma alteração que **mexa em código compilado**, não só whitespace.

**Proposta:** vou mudar uma string visível no `VersionCheckCard.tsx` — trocar o texto do botão de **"Verificar atualizações"** pra **"Verificar atualização"** (singular). Mudança mínima, reversível, mas garante novo hash.

Depois disso:
1. Você clica Publish (vai aparecer disponível, não mais "Up to date")
2. Me avisa "publiquei"
3. Eu volto pra aba do `trendfood.lovable.app` e confirmo se o `[VersionPoller] NOVA VERSÃO detectada` aparece + se o card de update surge na UI
4. Se funcionar: ✅ veredito final "voltou a atualizar igual antes"
5. Se quiser, depois reverto o texto pro original

## Arquivo afetado
- `src/components/dashboard/VersionCheckCard.tsx` (1 linha — texto do botão)

## Risco
Mínimo. Só muda um label de UI. Reversível em 5 segundos.
