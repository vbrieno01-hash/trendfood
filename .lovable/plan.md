
## Pedido

Fazer uma alteração mínima/visível pra publicar e validar end-to-end se o card de atualização aparece pros lojistas que já tinham a versão anterior.

## Análise

A foto confirma: você tá rodando `v2026.04.19.17.14` e o card "Versão do sistema" tá funcionando (mostra versão atual + botão "Atualizar agora"). O `pwa_last_seen_fp` no seu localStorage agora tem o fingerprint dessa versão.

Pra validar o fluxo real:
1. Faço uma mudança trivial que altere o bundle (novo hash em `/assets/`)
2. Você publica
3. Lojistas que já tinham a versão anterior aberta → card "Nova versão disponível" deve aparecer (via polling de 60s ou no boot da próxima sessão)
4. Você mesmo, sem dar Shift+R, vai ver o card aparecer sozinho em até 60s depois de publicar

## Mudança proposta

Vou ajustar a copy do próprio `VersionCheckCard.tsx` — trocar o texto descritivo pra ficar mais claro e adicionar o timestamp da última verificação. Duas vantagens:

1. **Muda o bundle** → novo hash → dispara detecção
2. **Melhora UX** do próprio card que estamos testando — fica óbvio se a alteração chegou (texto novo visível)

### Alterações em `src/components/dashboard/VersionCheckCard.tsx`

- Trocar descrição de:
  > "Clique para forçar a busca da versão mais recente do sistema."
  
  Para:
  > "Mantenha o sistema sempre atualizado. Clique para baixar a última versão disponível agora mesmo."

- Pequeno ajuste no toast: "Buscando a última versão…" → "Aplicando a última atualização…"

São mudanças puramente cosméticas, zero risco de quebrar nada, mas garantem hash novo no bundle.

## Como validar (passo a passo)

1. Implemento a mudança
2. Você clica em **Publish** no canto superior direito
3. Aguarda ~30s pro deploy propagar
4. **Sem dar Shift+R**, espera no máximo 60s na aba aberta → o card vermelho/laranja "Nova versão disponível" deve aparecer no canto da tela
5. Clica em "Atualizar agora" no prompt → app recarrega com `?_v=timestamp`
6. Depois do reload, abre o card "Versão do sistema" → vai mostrar o texto novo ("Mantenha o sistema sempre atualizado…") confirmando que pegou a versão nova

## Arquivo

- `src/components/dashboard/VersionCheckCard.tsx` — ajuste de copy
