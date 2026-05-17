## Objetivo

Trocar a tela atual de "internet lenta" (emoji 📶 + caixinha simples = parece o dinossauro do Chrome) por uma tela **futurista, premium, com cara de Trendfood** — mostrando potência da marca em vez de aparentar erro genérico.

Escopo: **só visual da tela de fallback** em `src/App.tsx` (componente `RouteFallback`, estágios 1 e 2). Nada de lógica, timing, recuperação de chunk ou rotas muda.

## Como vai ficar

**Estágio 1 (250ms – 8s) — Loading premium:**
- Fundo escuro com gradiente radial animado (cores do tema `--primary` / `--accent`).
- Partículas/grid sutil ao fundo (CSS puro, sem libs).
- Logo "TRENDFOOD" centralizado com efeito de **shimmer/glow pulsante** (gradiente animado no texto).
- Anel orbital girando ao redor do logo (dois círculos SVG concêntricos com `stroke-dasharray` animado).
- Texto sutil "Carregando experiência…" com pontinhos animados.

**Estágio 2 (>8s) — Conexão lenta, versão futurista:**
- Mesmo fundo gradiente + grid.
- Card central **glassmorphism** (`backdrop-blur-xl`, borda com gradiente, sombra com glow do primary) — alinhado ao tema Premium Live já existente na memória do projeto.
- Ícone de sinal customizado em SVG (ondas de Wi-Fi animadas, uma delas "quebrada" em vermelho/laranja sutil) em vez do emoji 📶.
- Título grande: **"Sinal fraco detectado"** com tipografia bold e gradiente no texto.
- Subtítulo limpo: "Sua conexão está instável. Vamos tentar novamente em segundos."
- Botão CTA premium: gradiente `primary → accent`, ícone de refresh girando no hover, glow ao redor, micro-animação de pulse.
- Linha de status técnica embaixo em mono pequena: `TRENDFOOD · status: reconectando` com bolinha verde piscando — passa sensação de sistema profissional monitorando.
- Footer minúsculo: "Powered by Trendfood".

## Detalhes técnicos

- Arquivo único: `src/App.tsx` — substituir JSX dos estágios 1 e 2 do `RouteFallback`.
- 100% Tailwind + tokens semânticos (`bg-background`, `text-foreground`, `text-primary`, `bg-gradient-to-*`) — sem hex hardcoded, segue regra do design system.
- Animações via classes Tailwind + `@keyframes` no `index.css` (adicionar `animate-shimmer`, `animate-orbit`, `animate-signal-pulse` se necessário).
- SVG inline para o ícone de sinal e o anel orbital — zero dependência nova.
- Mobile-first: card max-w-sm, padding generoso, texto responsivo.
- Acessibilidade: `role="status"` no loading, `aria-live="polite"` no estágio 2, contraste AA.

## O que NÃO muda

- Lógica de detecção de chunk velho, `recoverFromStaleChunk`, `ErrorBoundary`, timing dos estágios (250ms / 8s), `sessionStorage`, service worker — tudo intacto.
- Nenhum outro arquivo além de `src/App.tsx` (e possivelmente 3-5 linhas de keyframes em `src/index.css`).
- Funcionalidade da loja, checkout, dashboard, edge functions — zero risco.

## Resultado

Quando aparecer (raro, só em internet ruim de verdade), o cliente vê a marca **Trendfood se apresentando com presença**, não uma página de erro. Reforça profissionalismo perante o lojista e o consumidor final.