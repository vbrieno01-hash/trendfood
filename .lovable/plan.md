

## Plano

### Problema
Nos cabeçalhos da sidebar (OPERACIONAL ⚡, LOGÍSTICA 📦, etc) hoje:
- Cor `text-white/40` (muito apagada)
- Sem fundo, sem borda, sem separador
- Visualmente parecem botões desabilitados — o lojista não percebe que são *rótulos de seção* e não entende em qual categoria cada item está

### Solução — único arquivo: `src/pages/DashboardPage.tsx` (linhas ~822-827)

Transformar o cabeçalho num **divisor visual claro** que NÃO pareça botão clicável:

1. **Cor mais viva** mas com peso de "label": `text-primary/80` (laranja vibrante do tema, igual ao print que você mandou) em vez de `text-white/40`
2. **Linha divisória superior** (`border-t border-white/10`) que separa visualmente cada grupo
3. **Pequeno indicador lateral** (barrinha vertical de 2px na cor primária) à esquerda do emoji — dá identidade de "seção" sem parecer botão
4. **Espaçamento maior acima** (`mt-5` em vez de `mt-3`) pra respirar entre grupos
5. **Aumentar levemente o tamanho** do emoji e deixar o texto com `tracking-wider` + `font-bold` em vez de `font-semibold` — fica claro que é *título de categoria*
6. **Cursor `default`** explícito (não `pointer`) — reforça que não é clicável

### Resultado visual esperado

```text
─────────────────────────────  ← divisor sutil
▎⚡ OPERACIONAL                ← laranja vivo, barrinha lateral
   🛒 Balcão                   ← itens (clicáveis, inalterados)
   👨‍🍳 Cozinha & Pedidos
─────────────────────────────
▎📦 LOGÍSTICA
   🍽️ Cardápio (Menu)
   ...
```

### Não mexer
- Estrutura de `sidebarGroups`, lógica de filtro, navegação dos itens — tudo intacto
- Botões clicáveis (`navBtnClass`) — já estão bons
- Outros lugares do app

### Risco
Zero. Mudança puramente cosmética em ~6 linhas de className em 1 arquivo.

