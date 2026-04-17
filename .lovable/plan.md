

## Diagnóstico

O cliente atualizou agora e não viu o card "Nova versão disponível". Motivos possíveis:

1. **Polling de 30 min é muito longo** — se o lojista abriu o app logo após o publish, só vai checar atualização daqui 30 min
2. **Sem checagem ao focar a aba** — se o lojista deixou o app aberto em background e voltou, não revalida
3. **Sem checagem ao recuperar conexão** — se ficou offline e voltou, não revalida
4. **`vite.config.ts` ainda pode estar com `registerType: "autoUpdate"`** em vez de `"prompt"` — preciso confirmar

Preciso verificar o estado atual antes de propor mudanças.

## Verificação rápida do código atual

Vou olhar `vite.config.ts` e `usePWAUpdate.ts` pra confirmar o que tá rodando em produção agora.

## Plano (após verificar)

### 1. Reduzir polling de 30 min → 2 min
Em `usePWAUpdate.ts`, baixar `setInterval` de `30 * 60 * 1000` pra `2 * 60 * 1000`. Detecção quase imediata, custo de rede irrelevante (só checa um arquivo de manifest do SW).

### 2. Checar update ao focar a aba (visibilitychange)
Quando o lojista volta pra aba do navegador (ou abre o app no celular), forçar `registration.update()` na hora. Cobre o caso "deixei aberto em background".

### 3. Checar update ao voltar conexão (online event)
Se ficou offline e voltou, revalida na hora.

### 4. Checar update no mount inicial
Logo que o componente monta, dispara `update()` imediato em vez de esperar o primeiro intervalo.

### 5. Garantir `registerType: "prompt"` em `vite.config.ts`
Confirmar que tá `"prompt"` (e não `"autoUpdate"`) — se tiver `autoUpdate`, o SW assume sozinho e o card nunca aparece porque `needRefresh` não dispara.

### 6. Logs de debug temporários
Adicionar `console.info("[PWA]")` nos eventos chave (registrado, update detectado, needRefresh true) — assim na próxima vez você consegue abrir o console do lojista e ver onde travou.

## Arquivos

- `src/hooks/usePWAUpdate.ts` — adicionar listeners de visibility/online, reduzir polling, check inicial, logs
- `vite.config.ts` — confirmar/garantir `registerType: "prompt"`

## Resultado esperado

Você clica Publish → Update no Lovable → no máximo **2 minutos depois** (ou imediatamente se o lojista trocar de aba e voltar) o card aparece pra ele.

## Risco

Zero. Mudança em 2 arquivos, sem banco, sem RLS, sem fluxo de pedido.

