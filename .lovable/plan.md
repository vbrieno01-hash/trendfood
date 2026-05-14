# Por que cada página demora pra abrir na primeira vez

## Diagnóstico

Toda rota do app está marcada como **`lazy()`** em `App.tsx`:
```ts
const AuthPage = lazy(() => import("./pages/AuthPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const KitchenPage = lazy(() => import("./pages/KitchenPage"));
// ...e por aí vai
```

Isso significa que **o JavaScript daquela página só é baixado na hora que o usuário acessa pela primeira vez**. Em internet de loja (4G médio), cada chunk leva de 800ms a 3s pra baixar + parsear. Como o `RouteFallback` é só um spinnerzinho preto, dá a sensação de "tela travada carregando".

Depois que o navegador baixou uma vez, fica em cache → as próximas visitas ficam instantâneas. Bate exatamente com o que você descreveu.

A landing page (`Index.tsx`) também sofre: vários componentes pesados são lazy (`SavingsCalculator`, `TopStoresMarquee`, `StackedProblemCards`, `TimelineSteps`, `StickyShowcase`, `AnimatedComparison`, `MagneticFeatureCard`). A primeira visita à home faz uma cascata de downloads.

Some a isso o **`useAuth`** que bloqueia o render com `loading: true` enquanto faz `getSession()` + `fetchOrganization()` — em rotas protegidas o usuário vê o spinner em duas camadas (Suspense + AuthLoading).

## Plano

### 1. Prefetch agressivo no hover/focus dos links (impacto alto)
Criar um helper `<PrefetchLink>` que, ao passar o mouse ou focar num link interno, dispara o `import()` da página de destino antes do clique. Quando o usuário clicar, o chunk já estará no cache do browser → navegação instantânea.

Aplicar nos links principais: navegação do dashboard, botões da landing → Auth/Cadastro/Planos, links do header/footer.

### 2. Pré-carregar rotas críticas no idle pós-boot
Logo após o app montar, num `requestIdleCallback`, disparar em segundo plano os imports de:
- `AuthPage` (todo mundo passa por aqui)
- `DashboardPage` (loja logada)
- `KitchenPage` + `WaiterPage` (operação)
- `UnitPage` (cliente final)

Isso aproveita o tempo ocioso do navegador depois da primeira renderização.

### 3. Substituir o `RouteFallback` por um esqueleto contextual
Hoje é só um spinner numa tela preta — dá sensação de freeze. Trocar por um skeleton que respeita o layout (header + áreas), e mostrar o spinner só se demorar mais de 300ms (`startTransition` + delay).

### 4. Reduzir lazy desnecessário na landing (`Index.tsx`)
A landing é a página de venda — não pode "piscar" carregando seções. Vou:
- Manter `lazy` apenas nos componentes **abaixo da dobra** (que o usuário rola pra ver).
- Importar diretamente os componentes da primeira tela (`HeroCinematic` já é, tá ok; `TopStoresMarquee` e `StackedProblemCards` aparecem rápido também).

### 5. Não bloquear render da rota com `useAuth.loading` em rotas públicas
Hoje o `AuthProvider` segura toda a árvore. Para rotas públicas (`/`, `/unidade/*`, `/planos`, `/termos`, `/privacidade`), liberar render imediato e deixar a sessão hidratar em segundo plano.

### 6. Pequenos ajustes de bundle (`vite.config.ts`)
Já tem split por vendor — adicionar:
- `lucide-react` em chunk separado (são muitos ícones).
- `@tanstack/react-query` já está em `query`, ok.
- Verificar se `recharts` e `framer-motion` estão isolados (já estão).

## O que NÃO vou fazer

- Tirar `lazy` de tudo (faria o bundle inicial gigante e pioraria).
- Mexer em RLS, edge functions ou banco — esse problema é 100% frontend/carregamento.

## Estimativa de ganho

Com as 5 frentes:
- **Primeira navegação para qualquer página:** de ~2-3s pra ~200-400ms (chunk já em cache via prefetch/preload).
- **Landing:** primeira impressão visual mais rápida, sem "piscar" carregando seções.
- **Sensação geral:** muito mais "app-like", menos "site travando".

## Implementação proposta (ordem)

1. Criar `src/components/PrefetchLink.tsx` (substitui `<Link>` em links críticos).
2. Adicionar pré-carregamento idle das rotas chave em `App.tsx`.
3. Trocar `RouteFallback` por skeleton + delay no spinner.
4. Eager nos 2-3 componentes acima da dobra em `Index.tsx`.
5. Liberar `AuthProvider` em rotas públicas.
6. Ajuste fino do `vite.config.ts`.

Pode aprovar que eu já implemento tudo em sequência.
