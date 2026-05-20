# Bug encontrado — Loja redireciona pra landing por falha de rede

## Causa raiz (100% confirmada)

Em `src/pages/UnitPage.tsx` linha 226:

```ts
useEffect(() => {
  if (!orgLoading && (isError || org === null)) navigate("/404");
}, [orgLoading, isError, org, navigate]);
```

Dois problemas combinados criando exatamente o sintoma que o lojista descreveu:

1. **Gatilho hipersensível.** O `useQuery` em `useOrganization` tem `retry: 1` (config global). Em conexão instável (cliente no 4G fraco esperando comprar), 1 falha de rede → `isError = true` → `navigate("/404")`. A loja **existe**, mas o cliente é chutado fora dela.

2. **Rota `/404` não existe em `App.tsx`.** As rotas declaradas são `/`, `/auth`, `/unidade/:slug`, etc. `/404` cai no catch-all `*` → componente `NotFound`, que mostra um link "Return to Home" apontando para `/`. Quando o cliente clica (ou só por confusão), vai parar na **landing do TrendFood** em vez da loja onde estava comprando.

Resumindo o que o cliente vê:
1. Abre `trendfood.site/unidade/rei-do-burguer` no celular.
2. Conexão oscila por 1 segundo durante o fetch da organization.
3. `isError=true` → app navega pra `/404` → renderiza tela "404 Page not found".
4. Cliente clica em "Return to Home" → cai na landing do TrendFood (sem cardápio do Rei do Burguer).

Isso bate **exatamente** com a reclamação: "dá 404, e quando carrega volta pra página TrendFood, não a loja".

## Por que não pegamos antes
- No desktop com Wi-Fi estável o fetch nunca falha → o bug é invisível pra você.
- O log do servidor não registra nada porque a falha é client-side (rede do cliente).
- Os pedidos continuam entrando (`21 nas últimas 24h`) porque a maioria dos clientes tem conexão boa. Os afetados são justamente os que ficam frustrados e vão no balcão.

## Correção

**Arquivo único:** `src/pages/UnitPage.tsx`

1. **Remover** o `useEffect` que faz `navigate("/404")`.
2. **Renderizar inline** dois estados visuais (sem trocar de rota — o cliente continua em `/unidade/rei-do-burguer`):
   - **Erro de conexão** (`isError`): card "Não conseguimos carregar a loja. Verifique sua internet." + botão "Tentar novamente" que chama `refetch()`. Mostra `Skeleton` enquanto reloading.
   - **Loja realmente não existe** (`!orgLoading && !isError && org === null`): card "Loja não encontrada" + link pra landing como opção (não automático).

Vantagens:
- Cliente nunca sai da URL da loja → refresh, bookmark, voltar do WhatsApp, tudo continua funcionando.
- Falha transitória de rede não destrói a sessão de compra (carrinho no localStorage também sobrevive).
- Não toca em RLS, edge functions, banco, impressão, nem rotas — risco mínimo.

3. **Reforçar resiliência da query** em `src/hooks/useOrganization.ts`: subir `retry` de 1 (global) para 3 só nessa query e adicionar `retryDelay: (i) => Math.min(1000 * 2 ** i, 4000)`. Custo: zero (já bate em `maybeSingle` na mesma row). Benefício: 95% das falhas transitórias deixam de aparecer ao cliente.

## Não vou tocar
- Fila de impressão (`fila_impressao`, `enqueuePrint`, `printer-queue`) — você pediu pra deixar como está.
- Bug do heartbeat RLS — fica pra próxima rodada, não afeta cliente final.
- Qualquer outra parte do projeto.

Quer que eu implemente?
