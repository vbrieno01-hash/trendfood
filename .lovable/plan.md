
# Redesign do Dashboard — Identidade Visual Forte, Sem Morto

## Diagnóstico

Olhando a screenshot, os problemas são claros:

1. **Sidebar morta**: fundo branco liso, logo pequeno sem destaque, separadores invisíveis, itens cinzas apagados
2. **HomeTab sem hierarquia**: header "Olá! 👋" parece texto comum, sem peso visual
3. **Cards de métricas brancos**: se misturam com o fundo da página — zero contraste, zero impacto
4. **Card de faturamento hoje**: gradiente vermelho correto, mas o ícone $  gigante translúcido não agrega nada
5. **Banner de trial**: amarelo genérico de aviso de browser, sem design
6. **Gráfico**: bom dado, péssima apresentação — sem título visual, sem contexto

## O Que Vai Mudar

### 1. Sidebar — Fundo escuro/dark com identidade

A sidebar vai ter fundo escuro quase preto (`#0f0f0f` ou `#111`) com o logo e itens em branco. Isso cria o contraste clássico de dashboards profissionais como Vercel, Linear, Stripe.

- Logo TrendFood com texto branco
- Org info com avatar mais destacado
- Itens de nav: texto branco/70% em repouso, `bg-white/10` no hover, fundo vermelho no ativo
- Separador "OPERAÇÕES" em branco/30%
- "Ver página pública" e "Sair" na base, mais sutis

### 2. HomeTab — Header repaginado

Substituir o "Olá! 👋 {emoji} {nome}" por uma saudação mais profissional:
- Nome da organização em fonte grande e bold
- Subtítulo: data de hoje (ex: "Quinta-feira, 19 de fevereiro")
- Badge de status (trial/ativo) mais visual

### 3. Card "Faturamento Hoje" — mais impactante

- Adicionar um padrão sutil de bolinhas ou grid no fundo (via CSS `background-image: radial-gradient`)
- Mostrar também a variação percentual (ex: "+12% vs ontem") — calculando comparação com o dia anterior dos dados existentes
- Ícone substituído por algo mais contextual (seta de tendência)

### 4. Cards de métricas — glassmorphism sutil

Em vez de fundo branco (`bg-card`), usar fundo ligeiramente colorido com borda colorida correspondente ao ícone:
- Faturamento total: borda verde sutil, fundo `bg-green-50/60`
- Pedidos hoje: borda azul sutil, fundo `bg-blue-50/60`
- Aguardando: borda amarela sutil, fundo `bg-amber-50/60`
- Ticket médio: borda roxa sutil, fundo `bg-purple-50/60`

Valor em fonte maior (`text-2xl`), label menor. Sem caixa quadrada genérica de ícone — ícone direto com a cor da categoria.

### 5. Banner de trial — Design próprio

Substituir o yellow banner genérico por um componente com a identidade TrendFood:
- Fundo com gradiente vermelho-âmbar muito sutil
- Ícone Lucide `Zap` em vez do emoji ⏳
- Botão "Ativar plano" (CTA) ao lado direito, pequeno e ativo

### 6. Gráfico — Header melhorado

- Título sem emoji, tipografia mais forte
- Adicionar período e total de pedidos no subtítulo
- Gráfico mantido igual (dados são bons)

## Arquivos Afetados

| Arquivo | Ação |
|---|---|
| `src/pages/DashboardPage.tsx` | Sidebar dark com identidade, banner de trial redesenhado |
| `src/components/dashboard/HomeTab.tsx` | Header repaginado, cards de métricas coloridos, card hero melhorado |

Nenhuma mudança de banco de dados, rotas ou lógica de autenticação.
