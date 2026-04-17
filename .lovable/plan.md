

## Diagnóstico

O bot **não tá inventando** — ele tá literalmente reproduzindo o que tá no banco. O cardápio da TrendFood TEM uma categoria chamada "Lanches com 1 hambúrguer e sem batata frita" e outra "Bebidas". O modelo Gemini Flash leu fielmente e citou.

Mas tem 3 problemas reais:

### Problema 1: Markdown link não funciona no WhatsApp
O bot manda `[texto](url)` (formato Markdown). WhatsApp não interpreta isso e mostra os colchetes literais. **Solução:** instruir no prompt pra mandar URLs cruas (sem colchetes nem parênteses) e usar `*negrito*` (asterisco simples) em vez de `**duplo**`.

### Problema 2: Bot lista nomes de categoria como se fossem produtos
"Bebidas" e "Lanches com 1 hambúrguer e sem batata frita" são CATEGORIAS, não pratos. O bot deveria listar os ITENS quando o cliente pergunta "o que tem hoje". Hoje ele só cita nomes de categoria porque o prompt diz "use o cardápio" mas não orienta como apresentar.

### Problema 3: Prompt genérico demais
Não tem regra sobre formato de resposta, sobre não inventar, sobre como lidar com pedidos malucos ("quero uma casa"), nem sobre tom. Resultado: respostas inconsistentes e alucinação leve possível em qualquer pergunta.

## Plano

**Reescrever o prompt padrão** em `ai-bot-respond/index.ts` (e atualizar o registro atual em `ai_bot_config` via migration) com regras claras:

1. **Formato WhatsApp puro**: usar `*negrito*` (1 asterisco), URL crua sem colchetes, emojis com moderação, sem títulos `##`/`###`.
2. **Listar itens reais quando pedirem cardápio**: agrupar por categoria, mostrar nome + preço dos itens disponíveis (não só categoria).
3. **Nunca inventar**: se algo não tá no contexto fornecido, dizer "vou verificar com a equipe" ou direcionar pro link.
4. **Respostas curtas**: máximo 4 linhas, salvo quando listando cardápio.
5. **Tom**: simpático mas profissional, sem firulas.
6. **Pedidos fora do escopo** ("quero uma casa"): responder com bom humor leve e redirecionar pro cardápio.
7. **Link sempre cru**: `https://trendfood.lovable.app/unidade/mcd` direto, sem markdown.

Também:
- **Filtrar itens com preço 0** do contexto enviado pra IA (são itens "teste" que não devem aparecer pro cliente). Se o lojista deixou preço zero é provável que esteja em rascunho.
- **Atualizar o prompt salvo no banco** (registro atual em `ai_bot_config`) via migration pra você ver o novo prompt já no painel sem precisar reconfigurar.

## Arquivos a editar

1. `supabase/functions/ai-bot-respond/index.ts`
   - Trocar o `systemPrompt` default pelo novo prompt estruturado
   - Filtrar `menu_items` com `price > 0` na query
   - Adicionar instrução explícita no contexto sobre formato WhatsApp
2. **Migration**: UPDATE no registro singleton de `ai_bot_config` setando o novo `system_prompt`

## Resultado esperado

Cliente manda "o que tem hoje" → bot responde tipo:
```
Hoje temos:

🍔 *Lanches*
• Teste Burguer — R$ 653,45

🥤 *Bebidas*
• Teste Guarana — R$ 0,00

Pra pedir é só acessar:
https://trendfood.lovable.app/unidade/mcd

Estamos abertos até 22h 😉
```

Cliente manda "quero uma casa" → bot responde curto e bem humorado, redireciona pro cardápio sem 5 linhas de explicação.

Link aparece clicável no WhatsApp (porque é URL crua), negrito funciona, sem colchetes feios.

