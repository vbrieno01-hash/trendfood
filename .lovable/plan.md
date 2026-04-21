

## Plano — AuthPage estilo cinematográfico (com identidade TrendFood)

Mesmo conceito da xAI/Grok (split layout, logo gigante, formulário minimalista), mas usando a paleta TrendFood (laranja/vermelho/dourado) ao invés do preto puro.

### Painel esquerdo — formulário minimalista

**Fundo:**
- Fundo escuro com tom quente: gradiente sutil partindo de `hsl(20 30% 8%)` (preto-avermelhado profundo) com leve tinta laranja, ao invés de preto puro
- Mantém a sensação cinematográfica, mas com personalidade TrendFood

**Conteúdo:**
- Logo TrendFood pequena no canto superior esquerdo
- Badge sutil topo direito: "Você está entrando em **TrendFood**" com ícone laranja
- Título grande bold: "Crie sua conta" / "Entre na sua conta" — texto branco, tracking apertado
- Botões pílula:
  - **Principal (Google)**: pílula branca com texto escuro + ícone Google colorido (igual referência)
  - **Secundário (Email)**: pílula transparente com borda laranja sutil (`border-primary/30`), texto branco
- Divisor fininho com label "ou"
- Link "Já tem conta? **Entrar**" centralizado com cor primária no destaque
- Footer minúsculo: termos + privacidade
- Form de e-mail expande inline (sem trocar de tela) ao clicar no botão

### Painel direito — vitrine cinematográfica TrendFood

**Fundo:**
- Gradiente radial quente: centro `hsl(15 80% 25%)` → bordas `hsl(20 40% 10%)` (laranja queimado profundo, não preto)
- Glow lateral cinematográfico vindo da direita: gradiente radial laranja-dourado simulando "luz vazando" atrás da logo
- Textura sutil de grão/noise opcional pra dar profundidade premium

**Conteúdo:**
- Logo TrendFood **gigante** centralizada (60-70% da altura)
- `drop-shadow` quente: `drop-shadow-[0_0_80px_rgba(255,140,0,0.4)]` pra logo "brilhar"
- Pequeno tagline embaixo opcional: "Zero taxas. 100% seu." em letra fina branca

**Borda de fusão:**
- Gradiente vertical fino na borda esquerda do painel direito → fundir suavemente com o painel do form

### Mobile

- Painel direito esconde (`hidden lg:flex` já existe)
- Mobile: mesmo fundo gradiente quente escuro, logo TrendFood centralizada no topo, formulário minimalista abaixo

### Lógica preservada

Zero mudança em comportamento:
- `handleSignup`, `handleLogin`, `handleGoogleLogin`, `googleOnboarding`
- `refParam` (afiliados), `planParam`, `redirectTo`
- Recuperação de senha
- Toda integração Supabase intacta

### Paleta usada (já no design system)

- `--primary` (laranja TrendFood) para acentos, bordas, hover
- Branco/branco translúcido para textos e botão principal
- Tons escuros quentes (avermelhado/marrom profundo) ao invés de preto puro — reforça identidade
- Sem cinza neutro frio em lugar nenhum

### Arquivo

- `src/pages/AuthPage.tsx` (refatoração visual completa do JSX, lógica 100% intacta)

### Resultado

Página com cara de produto premium (mesmo conceito visual da Grok/xAI), mas **inegavelmente TrendFood**: paleta quente laranja-dourado, logo gigante brilhando, formulário pílula minimalista. Não vai parecer preto/cinza genérico — vai ter a alma quente da marca.

