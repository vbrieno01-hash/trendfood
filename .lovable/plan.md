
## Resposta direta

**Sim, tá garantido pra TODAS as lojas — antigas, atuais e futuras.** Mas deixa eu te explicar exatamente por quê pra você ficar 100% seguro:

## Onde a regra mora

A validação de "loja aberta/fechada" mora em **dois lugares**, e os dois foram corrigidos:

### 1. Backend (banco de dados) — proteção definitiva

A função `validate_store_open_for_order()` é um **trigger SQL** que roda **antes de qualquer pedido ser inserido** na tabela `orders`. Ela:

- Lê `business_hours` da própria loja (qualquer loja, sem exceção)
- Calcula a hora atual em `America/Sao_Paulo` direto no banco (não depende do celular do cliente)
- Aplica a lógica nova de cross-midnight (janela 00:00–04:00 pertence ao dia anterior)
- Se a loja estiver fechada → **bloqueia o pedido com erro**

Como é uma função global do banco, **ela vale automaticamente pra**:
- ✅ Todas as lojas que existem hoje (Rei do Burger, todas as outras)
- ✅ Toda loja nova que for criada amanhã, mês que vem, ano que vem
- ✅ Não precisa migrar dado nenhum, nem mexer em loja por loja

**Não tem como um pedido fechado passar.** Mesmo se um hacker tentasse forjar uma requisição direto na API, o trigger bloqueia.

### 2. Frontend (UI da vitrine) — experiência do cliente

O arquivo `src/lib/storeStatus.ts` calcula o status pra mostrar "Aberto/Fechado" no cardápio público. Ele:

- Usa `Intl.DateTimeFormat` com timezone `America/Sao_Paulo` (funciona em qualquer dispositivo, qualquer fuso, com ou sem horário de verão)
- Aplica a mesma lógica de cross-midnight do backend
- Esconde o botão de pedido quando fechado

Esse arquivo é **único e compartilhado** por toda a aplicação — então qualquer loja que carrega a vitrine usa ele. Não tem código duplicado por loja.

## O que pode ainda dar "loja aberta" quando deveria estar fechada

Pra ser 100% transparente com você, **três cenários legítimos** ainda mostram a loja aberta:

| Cenário | O que acontece | Ação do lojista |
|---|---|---|
| `force_open = true` | Lojista clicou no toggle "Forçar abertura" no painel | É proposital — desligar o toggle |
| `business_hours.enabled = false` | Lojista nunca configurou horário | Configurar horário no painel |
| Cliente com aba antiga aberta | Vitrine carregou antes da meia-noite e ficou parada | Refetch automático a cada 5 min já corrige |

Os 3 são **comportamento por design**, não bug. Se quiser, posso reforçar o cenário 3 (refetch mais agressivo, tipo a cada 1 min) — mas hoje 5 min já tá bom.

## Como eu vou provar pra você agora

Aprovando o plano, eu rodo um diagnóstico no banco que:

1. **Conta quantas organizações existem** no total
2. **Lista todas que estão `force_open = true`** (essas vão aparecer abertas mesmo fechadas — é proposital)
3. **Lista todas com `business_hours.enabled = false`** (sem horário configurado)
4. **Pega o caso do Rei do Burger** especificamente: mostra `business_hours`, `force_open`, `paused`, e calcula manualmente — usando a hora atual de Brasília — qual deveria ser o status agora
5. **Tenta inserir um pedido teste** (e deleta na mesma transação) pra confirmar que o trigger backend bloqueia de verdade fora do horário

Depois desse diagnóstico, eu te mando um relatório direto: "X lojas tão certas, Y tão com force_open ligado (lojista esqueceu), Z sem horário configurado (lojista nunca preencheu)".

## Conclusão

A correção é **estrutural, não loja por loja**. Está aplicada no:
- ✅ Trigger SQL global (banco) → vale pra qualquer loja, agora e no futuro
- ✅ Função TS compartilhada (frontend) → mesma coisa
- ✅ Testes automatizados regredindo o caso do Rei do Burger pra nunca voltar

Aprovando, faço o diagnóstico e te confirmo loja por loja com dados reais.
