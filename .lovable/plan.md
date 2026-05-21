## Bug encontrado na aba iFood Merchant API

Reproduzi: ao abrir a aba "iFood Merchant API", o painel dispara **4 chamadas em sequência** (`get_merchant`, `get_status`, `get_opening_hours`, `list_interruptions`) pra primeira loja conectada. Hoje a única loja listada (GBflix) tem `merchant_id` cadastrado mas o iFood responde **403 "User is forbidden to access this resource"** — ou seja, a credencial/merchant não tem permissão de produção pra esses endpoints.

Resultado visto pelo usuário:
- 4 toasts vermelhos empilhados, cada um com JSON cru.
- Console com `RUNTIME_ERROR: Edge function returned 403`.
- Nenhuma orientação do que fazer.

Confirmei via `curl` direto na edge function: o 403 vem do iFood, não do nosso `verify_owner_or_admin` (esse passa — admin é reconhecido).

---

## O que vou fazer (UX puro, sem mexer em backend/credenciais)

**`src/components/admin/IFoodMerchantHomologTab.tsx`:**

1. **Empty state quando não há loja conectada** — em vez de só `option value=""`, mostrar card explicativo "Nenhuma loja com credencial iFood ativa".
2. **Silenciar o toast de erro em `loadAll`** — chamadas automáticas de carregamento não devem disparar toast. Em vez disso, guardar o último erro em estado (`{ code, message }`) e renderizar um **banner inline amarelo** no topo: "iFood retornou {code}: {message}. Verifique se o `merchant_id` está homologado em produção e o token tem escopo `merchant.read`."
3. **Manter toast para ações manuais do usuário** (criar pausa, rodar checklist, deletar pausa) — aí o feedback imediato faz sentido.
4. **Mostrar "—" / skeleton** nos 4 cards (Dados, Status, Horários, Pausas) quando o fetch falhou, sem quebrar o layout atual.
5. **Não chamar `loadAll` automaticamente** se o `merchant_id` estiver vazio ou a credencial estiver `expired` — evita 403 garantido.

---

## Sobre as outras abas

Já varri o resto na pass anterior (Dashboard, KPIs, gráfico — corrigidos no commit anterior). Olhando o restante por código + network, **não vi outros bugs ativos** em Lojas, Configurações, Site, Relatórios, Logs de Erros, Ativações, Capacidade, Limpeza, Versões, Telegram, Indicações, Afiliados, WhatsApp, Suporte, Robô IA, Guia ou Funcionalidades.

Se quiser que eu abra cada uma manualmente no preview pra dupla checagem visual, é só me dizer — mas tende a só consumir mais tempo. O risco real estava nos 3 bugs já consertados + esse da aba iFood.

---

## Escopo

- 1 arquivo só (`IFoodMerchantHomologTab.tsx`)
- Sem mudanças no banco, sem mudanças na edge function, sem mexer em RLS
- Não afeta venda/impressão/qualquer outro fluxo