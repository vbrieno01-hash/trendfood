## Objetivo
Deixar a Dashboard do painel admin (`/admin` → aba Home) mais viva, premium e densa de informação útil — sem mexer nas outras abas nem adicionar novas métricas inventadas. Manter o tema Premium Live (glassmorphism dark, accent laranja).

Os previews de prototype não estão renderizando no chat, então vou direto pra implementação descrita abaixo. Se preferir outra direção depois, é só dizer.

## Mudanças (apenas em `src/pages/AdminPage.tsx` + 1 componente novo)

### 1. Hero header repaginado
- Greeting maior (`text-2xl font-extrabold`) com gradiente sutil no nome "Admin".
- Linha de meta com data + separador + status "Plataforma estável" em verde.
- À direita: pill "Plataforma Online" (mantida), botão "Dashboard" virou um chip glass com ícone — sem mudar destino.

### 2. KPI cards — versão "pulse"
Atualizar o componente `KpiCard` local pra incluir:
- Sparkline SVG mini (últimos 6 meses, dados derivados de `orgs.created_at` ou `payments.paid_at`) embutida no rodapé do card.
- Delta % vs período anterior em badge colorido (verde/vermelho/cinza neutro) — para MRR, Receita Estimada, Total Lojas e Assinantes.
- Hover: leve `translate-y-[-2px]` + glow do gradient do próprio card.
- Ícone maior, em container glass com borda do gradient.

Os 6 KPIs continuam os mesmos (Receita Estimada, MRR, A Receber, Total Lojas, Assinantes, Trials). Só mudam visualmente.

### 3. Faixa "Saúde da Plataforma" (NOVA — bento de 4 mini-cards)
Logo abaixo dos KPIs, antes dos quick actions. Mostra sinais já disponíveis:
- **Lojas pagantes ativas** (`payingOrgs.length`) + barra de proporção sobre o total.
- **Trials ativos** com micro-progress até conversão (% que viraram pagantes histórico).
- **Crescimento MoM** (newThisMonth vs newLastMonth) com seta e cor.
- **Taxa de conversão de trial** se houver dados, senão placeholder neutro "—".

Cada mini-card é um `admin-glass` com label uppercase, número grande, e indicador secundário pequeno. Sem novas queries — só derivar do que já existe (`orgs`, `payments`, `payingOrgs`, `trialCount`, `newThisMonth/LastMonth`).

### 4. Quick actions repaginadas
Trocar os 4 pills atuais por cards horizontais maiores (ícone + título + subtítulo de 1 linha tipo "ver 18 lojas cadastradas"). Grid `md:grid-cols-4`, hover com lift e accent. Mesmas ações/destinos.

### 5. GrowthCharts — sem mudança estrutural
Manter o componente como está; ele já é o gráfico de Novas Lojas e Receita por Mês.

### 6. Tabela "Detalhamento de Assinantes" — premium
- Cabeçalho da seção: ícone Crown em badge laranja sólido com glow, título, e à direita botão CSV + contador "X assinantes pagantes".
- Linhas: avatar colorido (já existe) + slug em monospace muted abaixo do nome.
- Coluna "Status": badge pulse verde "Ativo" com dot animado.
- Linha de total (tfoot) com fundo gradient laranja/transparent e valor em destaque.

### 7. Fundo da página
Adicionar gradient radial laranja muito sutil no canto superior direito do `<main>` da home — só visual, fica sob o conteúdo (`pointer-events-none`).

## Implementação técnica
- Tudo dentro do `<main>` do `AdminPage.tsx` quando `activeTab === "home"`.
- Atualizar componente `KpiCard` existente (no mesmo arquivo) com props opcionais `sparkline?: number[]` e `deltaPct?: number`.
- Calcular sparklines via `useMemo` sobre `orgs` e `payments` agrupando por mês.
- Sem dependências novas. Sem queries Supabase novas. Sem mudanças em outras abas.

## Fora de escopo
- Não tocar em sidebar, outras abas (Lojas, Indicações, Afiliados, etc.), edge functions, RLS, ou banco.
- Não trocar paleta principal nem o sistema glassmorphism Premium Live.
- Não adicionar métricas que dependam de dados novos.
