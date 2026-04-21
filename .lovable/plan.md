

## Plano — Landing TrendFood "Premium Cinematográfica"

Transformar a landing de "site bonitinho" em **experiência cinematográfica scroll-driven**, com efeitos que praticamente nenhuma SaaS BR de food tem hoje. Mantendo conteúdo, identidade laranja e estrutura — mudando só a **forma como aparece**.

---

## Conceito visual

A página vai funcionar como um **filme curto**: cada seção tem sua "entrada", as coisas montam na frente do cliente, peças se encaixam, números sobem ao vivo, mockups giram em 3D conforme rola. Sensação de produto **caro, vivo e premiado**.

---

## 8 efeitos novos que serão implementados

### 1. Hero com **mockup 3D que gira com o mouse** + parallax de partículas
- Substituir a foto estática do hero por um **dashboard mockup flutuante em 3D** que inclina conforme o mouse (efeito tilt suave, igual Apple Vision Pro / Linear).
- Atrás do mockup: **partículas laranja flutuando devagar** (estrelinhas/poeira) com parallax em camadas conforme rola.
- Texto do título com **gradiente animado** (laranja claro → escuro → claro) varrendo lentamente.
- Botão "Começar Grátis" com **brilho que passa** a cada 4s (shimmer).

### 2. **Stack de cards 3D** que se desempilha no scroll (problemas)
- Os 3 problemas hoje aparecem lado a lado. Vão virar uma **pilha de cards** que se separa conforme o scroll: o de cima sobe, os de baixo aparecem em sequência girando levemente em 3D.
- Cada card revela seu conteúdo com **máscara de gradiente** (efeito reveal cinematográfico).

### 3. **Linha do tempo conectada** com SVG animado (Como Funciona)
- Os 4 passos hoje estão lado a lado com setinha. Vão virar uma **linha SVG sinuosa** que se **desenha conforme o scroll passa** (stroke-dashoffset animado).
- Os ícones de cada etapa **acendem** (glow laranja) quando a linha chega neles.
- Cada card "salta" do lado da linha com bounce sutil.

### 4. **Showcase com mockup que troca de tela** (sticky scroll)
- A seção do dashboard fica **grudada na tela** (sticky) por uns 100vh enquanto o usuário rola.
- À medida que rola, o **mockup do dashboard troca de aba sozinho**: Pedidos → Caixa → Mais Vendidos → Cardápio → KDS. Cada troca acompanhada por uma legenda lateral que muda também ("Veja vendas ao vivo", "Feche o caixa em 1 clique", etc).
- Padrão Apple/Stripe.

### 5. **Comparativo com efeito "balança"** + barras animadas
- Marketplace vs TrendFood: a tabela vira um **gráfico animado** onde a coluna do marketplace começa cheia (vermelho 27%) e **esvazia** conforme o scroll passa, enquanto a coluna TrendFood enche (verde 0%).
- Visceral. Mostra economia em movimento.

### 6. **Calculadora com contador giratório estilo aeroporto**
- Hoje tem `SavingsCalculator`. Vou trocar o display de número por um **odômetro/flip-counter** (aqueles números rolando estilo painel de aeroporto antigo) quando recalcula.
- Efeito instantâneo de "uau, está calculando de verdade".

### 7. **Cards de funcionalidades com magnetismo + glow no hover**
- Os 14 cards de features ganham:
  - **Magnetic effect**: o card se inclina suavemente perseguindo o cursor (3D tilt leve).
  - **Glow radial laranja** que acompanha o mouse dentro do card (igual GitHub Copilot, Vercel).
  - **Borda animada arco-íris laranja** quando hover (gradient conic rotacionando).
- Aparecem em scroll com **stagger reveal** (um após o outro).

### 8. **Marquee de "social proof" + contador gigante**
- Logo abaixo do hero, antes dos problemas: faixa horizontal **rolando infinitamente** com badges de credibilidade ("Zero comissão", "Suporte 24/7", "PIX automático", "Sem app", logos fictícios de tipos de negócio: Pizzaria, Hamburgueria, Açaiteria, Loja, Mercearia, etc) — efeito **marquee infinito** que nunca para.
- O contador de pedidos atual (que já existe) vai virar uma **seção dedicada** com o número GIGANTE (texto 8rem, gradiente laranja, **flip animation a cada novo pedido em tempo real**) com legenda "Pedidos processados pela plataforma" e um pulso verde "ao vivo".

---

## Detalhes técnicos

**Bibliotecas/abordagem** (sem dependências pesadas — tudo em CSS/Framer Motion + Intersection Observer):
- **Framer Motion** (`framer-motion`) — única dep nova, padrão da indústria, ~50KB. Usado pra: parallax, stack reveal, sticky scroll com troca de aba, magnetic cards, contadores.
- **CSS puro** pra: shimmer, gradiente animado, marquee infinito, glow radial, conic-gradient borders.
- **SVG** pra: linha do tempo desenhada (stroke-dashoffset).

**Performance**:
- `prefers-reduced-motion` respeitado em todos os efeitos (acessibilidade + bateria mobile).
- Animações usam `transform`/`opacity` (GPU), nunca layout properties.
- Lazy mount: efeitos pesados (sticky showcase, magnetic) só montam quando entram na viewport.
- Mobile: efeitos 3D/magnetic desligados, mantendo só fade/slide simples (UX limpa em touch).

**Estrutura de arquivos** (refatoração organizada):
- Novos componentes em `src/components/landing/`:
  - `HeroCinematic.tsx` — hero com mockup 3D + partículas + shimmer
  - `MarqueeSocialProof.tsx` — faixa rolante infinita
  - `LiveOrderCounter.tsx` — contador gigante flip + pulso ao vivo
  - `StackedProblemCards.tsx` — pilha de cards desempilhando
  - `TimelineSteps.tsx` — linha SVG desenhada + cards conectados
  - `StickyShowcase.tsx` — dashboard que troca de aba no sticky scroll
  - `AnimatedComparison.tsx` — barras esvaziando/enchendo
  - `MagneticFeatureCard.tsx` — card individual com tilt + glow radial
- `src/pages/Index.tsx` — fica como orquestrador, monta as seções na ordem.
- `src/index.css` — adicionar keyframes: `shimmer`, `gradient-sweep`, `marquee`, `flip-number`, `glow-pulse`.

**Conteúdo/CMS**:
- **Zero impacto** no CMS atual (`platform_content`). Todos os textos continuam editáveis. Só a renderização visual muda.

---

## Antes vs Depois (resumo executivo)

| Seção | Hoje | Depois |
|---|---|---|
| Hero | Foto fixa + texto | Mockup 3D tilt + partículas + shimmer no CTA |
| Social proof | Badges parados | Marquee infinito + contador gigante ao vivo |
| Problemas | 3 cards em grid | Stack desempilhando em 3D no scroll |
| Como Funciona | 4 cards + setinhas | Timeline SVG desenhada + ícones acendendo |
| Showcase | Mockup estático | Sticky scroll com troca de aba sincronizada |
| Comparativo | Tabela | Barras animadas (vermelho esvazia / verde enche) |
| Calculadora | Número fixo | Flip-counter estilo aeroporto |
| Features | Cards hover simples | Magnetic tilt + glow radial seguindo mouse |

---

## Resultado esperado

- O cliente abre a landing → **bate o olho e percebe que é caro**
- Não parece feito com IA, parece feito por estúdio premiado
- Tempo médio de permanência sobe (cada seção dá vontade de scrollar pra ver o próximo efeito)
- Conversão sobe porque a percepção de qualidade do produto sobe junto
- Acessibilidade preservada (reduced-motion, touch, mobile)

---

## Execução

Vou implementar tudo num único passe (8 componentes novos + refactor do Index + CSS). É um trabalho denso mas coeso — fragmentar atrapalha porque os efeitos se complementam. Cobertura: desktop premium, mobile leve e funcional. Demora um pouco mais pra gerar mas você recebe a página inteira nova de uma vez.

