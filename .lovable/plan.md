

## Diagnóstico — o que realmente está acontecendo no TrendFood

Olhei logs reais, banco e métricas das últimas semanas. Os "errinhos bestas" não são tão besta — tem padrão. Aqui vai a foto sincera:

### Achados quantificados (últimos 7 dias)

| Métrica | Valor | Significado |
|---|---|---|
| Pedidos | 204 | Movimento saudável |
| Pedidos cancelados | **17 (8,3%)** | Alto. Padrão setor: 2-4% |
| Itens na fila de impressão travados há +1h | **146** | Impressão silenciosamente quebrada |
| Erros JS no client | 48 | Concentrados em 5 padrões |
| Lojas com banner | só 3 de 11 | Confirma o problema do banner |

### Os 5 erros que mais aparecem

1. **`Should have a queue. This is likely a bug in React`** (14x) — bug grave do React; a tela inteira crasha e cai no ErrorBoundary. Geralmente causado por componente sendo renderizado fora da árvore (ex: `ConditionalSupportChat`, `PWAUpdatePrompt`) ou por hook chamado condicionalmente.
2. **`null is not an object (evaluating 'X.target')`** (12x) — handler de evento sendo chamado depois do unmount (toast, dropdown, sheet fechando enquanto o usuário clica de novo).
3. **`ReferenceError: ColorField is not defined`** (3x — ainda hoje 10:59) — sobrou import morto no `StoreProfileTab.tsx` depois de removermos o bloco de cores agora há pouco.
4. **`Failed to fetch dynamically imported module: DashboardPage.tsx`** — quando sai uma versão nova, quem está com a aba aberta recebe erro de chunk velho. Ninguém recarrega → pegadinha clássica de PWA.
5. **`Rendered more hooks than during the previous render`** — algum componente do dashboard renderiza hooks condicionalmente.

### Os 4 problemas operacionais

- **Fila de impressão entupida**: 146 itens com `status='pendente'` há mais de 1h. Ou a impressora tá offline e a fila não está "expirando", ou o robô local não está processando. Não tem job que limpa isso.
- **Cancelamentos altos (8%)**: precisa entender **por que** clientes/lojistas cancelam. Hoje não temos motivo registrado.
- **Banner sumindo**: já corrigimos a causa raiz, mas só 3 de 11 lojas têm banner. Falta um onboarding/tutorial visual.
- **Segurança DB**: linter aponta 19 issues — várias políticas RLS com `USING (true)` em UPDATE/DELETE (couriers, deliveries, courier_shifts, fila_impressao public update). Em produção isso permite que qualquer um sem login altere registros operacionais.

---

## Plano — 4 frentes priorizadas

### Frente 1 — Estabilidade (resolve 80% dos crashes) — PRIORITÁRIA

**1.1** Limpar o `ColorField is not defined` — varrer `StoreProfileTab.tsx` e remover qualquer referência morta ao componente removido.

**1.2** Resolver `Should have a queue` — mover `<ConditionalSupportChat />` e `<PWAUpdatePrompt />` para **dentro** da `<Routes>` ou garantir que não desmontam/remontam em transições. Padrão atual tá causando reset de fiber.

**1.3** Auto-reload em chunk antigo — quando o erro for `Failed to fetch dynamically imported module`, em vez de só logar, **forçar `window.location.reload()` 1x** (com flag em sessionStorage pra não loopar). Resolve a #4.

**1.4** Guard nos `e.target` — varrer handlers que acessam `e.target` direto e adicionar `if (!e?.target) return;`. Resolve a #2.

### Frente 2 — Operação confiável (impressão + cancelamentos)

**2.1** Job pg_cron diário **`expire-stuck-prints`** — marca como `expirado` qualquer item da `fila_impressao` com mais de 24h em `pendente`, e cria notificação no admin com a contagem. Mantém a fila enxuta.

**2.2** Card "Saúde da Impressora" no dashboard — mostra quantos itens pendentes a loja tem agora. Se >5 e mais antigos que 10min, alerta vermelho: "Impressora desconectada — verifique".

**2.3** **Motivo de cancelamento obrigatório** — quando o lojista cancela um pedido, abrir um seletor: "Falta de produto / Cliente desistiu / Endereço fora da área / Erro do sistema / Outro". Salvar em `orders.cancellation_reason`. Sem analytics de motivo, não dá pra atacar a causa.

### Frente 3 — Segurança DB (19 warnings do linter)

Migration única substituindo `USING (true)` permissivos por validação real:
- `couriers_update_public` → exigir match de `courier_id` via header ou usar tokens de sessão
- `deliveries_update_public` → restringir colunas que motoboy pode mexer (status, accepted_at, delivered_at)
- `courier_shifts_update_public` → idem
- `fila_impressao` UPDATE público → restringir só ao status `printed_at`/`status`
- Revisar RLS Enabled No Policy (1 tabela sem nenhuma policy)

### Frente 4 — Onboarding visual (resolve baixo uso de banner/logo)

**4.1** Adicionar à `SetupChecklist` (Home tab) os itens "Adicionar logo da loja" e "Adicionar banner". Hoje não estão lá — por isso 8 de 11 lojas estão sem banner.

**4.2** Banner placeholder no UnitPage quando `banner_url` for null — uma faixa com gradiente laranja + nome da loja em destaque. Hoje fica vazio e parece bug.

---

## Como vou medir o sucesso

Depois de implementar, em 7 dias:

- Erros JS: cair de 48/sem para <10/sem
- Fila travada: cair de 146 para <20
- Banner adoção: subir de 27% (3/11) para 60%+
- Linter: 19 → 0 warnings
- Cancelamentos: começar a ter motivos categorizados (impossível medir hoje)

## Sugestão de execução

Implementar **na ordem Frente 1 → 2 → 3 → 4**. Frente 1 sozinha já melhora muito a percepção do "errinho besta todo dia". Posso fazer tudo num único passe, mas se preferir partir em PRs pequenos para validar uma frente por vez, também dá.

