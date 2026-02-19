
# Redesign da AuthPage — Layout Split Screen com Animação de Mapa de Pontos

## O que o usuário quer

Adaptar o layout do componente `travel-connect-signin-1` para a tela de login/cadastro do TrendFood, mantendo:
- A lógica de autenticação já existente (signup com organization + login)
- A identidade visual vermelha do site
- O estilo split screen (esquerda animada + direita com formulário)

## Análise do Componente de Referência

O componente tem:
- **Esquerda**: Canvas animado com mapa de pontos + rotas se movendo + logo sobreposto
- **Direita**: Formulário de email/password com framer-motion
- Layout 50/50 em desktop, empilhado em mobile

## O que precisa ser adaptado

| Elemento do original | Adaptação TrendFood |
|---|---|
| "Travel Connect" branding | TrendFood + ChefHat icon |
| Mapa de rotas de viagem | Mapa de pontos com emojis de comida flutuando (🍔 🍕 🌮) |
| Gradiente azul | Gradiente vermelho escuro (tema do site) |
| "Sign in / Login with Google" | Abas "Entrar / Criar conta" (sem Google) |
| Campos em inglês | Campos em português com toda lógica existente |
| Animações framer-motion (botão hover) | Manter apenas onde já temos suporte |

## Instalação necessária

`framer-motion` não está no `package.json` atual. Precisa ser instalado.

**PORÉM**: O projeto já usa animações CSS puras (Tailwind `animate-bounce`, `animate-pulse`). Para evitar dependência extra, vamos implementar as animações usando **CSS puro** em vez de framer-motion — o visual ficará idêntico mas sem nova dependência.

## Estrutura do novo AuthPage

```text
┌────────────────────────────────────────────────────────┐
│  DESKTOP (min-h-screen, flex-row)                      │
│                                                        │
│  ┌────────────────┐  ┌──────────────────────────────┐  │
│  │  LADO ESQUERDO │  │  LADO DIREITO (formulário)   │  │
│  │  (w-1/2)       │  │  (w-1/2)                     │  │
│  │                │  │                              │  │
│  │  Fundo vermelho│  │  Abas: Entrar | Criar conta  │  │
│  │  escuro        │  │                              │  │
│  │                │  │  [Form com toda lógica atual]│  │
│  │  Canvas com    │  │                              │  │
│  │  pontos        │  │  - Email                     │  │
│  │  animados      │  │  - Senha (show/hide)         │  │
│  │                │  │  - Para signup: nome,        │  │
│  │  🍔 emojis     │  │    lanchonete, slug          │  │
│  │  flutuando     │  │                              │  │
│  │                │  │  [Botão CTA vermelho]        │  │
│  │  Logo TrendFood│  │                              │  │
│  │  sobreposto    │  │                              │  │
│  └────────────────┘  └──────────────────────────────┘  │
└────────────────────────────────────────────────────────┘

MOBILE: empilha verticalmente (esquerda vira topo pequeno)
```

## Detalhes técnicos de implementação

### Lado Esquerdo (painel decorativo)
- Fundo: `bg-gradient-to-br from-red-900 via-red-800 to-red-950`
- Canvas (`useRef` + `useEffect`) com pontos em grade, opacidade variável — igual ao componente original mas com cores vermelhas
- Rotas animadas no canvas simulando pedidos chegando
- 6 emojis de comida posicionados absolutamente com animação CSS `animate-bounce` em delays diferentes (`animation-delay: 0s, 0.5s, 1s...`)
- Logo TrendFood (ChefHat) + texto sobreposto no centro/topo esquerdo
- Frase: "Seu cardápio gerenciado com inteligência"

### Lado Direito (formulário)
- Fundo branco/card
- Abas shadcn (Entrar / Criar conta) — mantendo exatamente o mesmo JSX e lógica do AuthPage atual
- Botões com a cor primária vermelha do site
- `ArrowRight` icon no botão (inspirado no design original)
- Responsivo: em mobile o canvas some e o form ocupa 100%

### Animação CSS dos emojis (sem framer-motion)
```css
/* Adicionado no JSX via style prop */
animation: float 3s ease-in-out infinite alternate;
animationDelay: "0.5s"
```

```css
/* No index.css */
@keyframes float {
  from { transform: translateY(0px) rotate(-5deg); }
  to { transform: translateY(-18px) rotate(5deg); }
}
```

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/pages/AuthPage.tsx` | Reescrever layout com split screen, mantendo toda lógica de auth |
| `src/index.css` | Adicionar keyframe `@keyframes float` |

Sem novos pacotes, sem migrações de banco — apenas visual.

## Resultado esperado

Uma tela de auth moderna, com identidade visual forte de food service, animação de mapa de pontos vermelhos à esquerda com emojis flutuando, e o formulário completo (login + cadastro) à direita — tudo mantendo a lógica existente de criação de conta com organization e slug.
