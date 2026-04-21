

## Plano — Corrigir landing "incompleta" em mobile/tablet

Você não está vendo bug, está vendo **buracos de design responsivo**. Vários efeitos foram desenhados pra desktop e em telas <1024px deixam metade da seção vazia. Vou fechar esses buracos sem perder o efeito premium do desktop.

### Os 5 buracos identificados (viewport ≤1024px)

| Onde | O que está acontecendo | Correção |
|---|---|---|
| **Hero** | Mockup 3D escondido (`hidden lg:block`). Lado direito vira coluna vazia + hero com `min-h-screen` deixa meia tela em branco | Mostrar mockup também em md/tablet (escala menor, sem tilt 3D), e remover `min-h-screen` em <lg — usar altura natural |
| **StickyShowcase** | Altura `400vh` mesmo no mobile, mas em coluna única o sticky-scroll não faz sentido | No mobile, virar **carrossel/lista vertical** das 5 abas com mockup acima; altura natural, sem sticky |
| **TimelineSteps** | Em md (≥768) tem linha vertical, abaixo de md cada passo fica espaçado demais (`mb-16`) e o mockup de 128px central do lado parece flutuando | Em mobile: layout vertical compacto com linha lateral à esquerda, ícones menores (w-20), `mb-8` |
| **Padding vertical** | Quase toda seção tem `py-24` (192px) — sobreposto, parece "vazio" | Em mobile reduzir pra `py-12 md:py-24` em todas as seções da landing |
| **Benefit cards** | Em mobile viram 1 coluna sem mais nada, e a seção tem `py-16` solta — parece "deslocada" | Reduzir padding em mobile e juntar visualmente com a próxima seção (sem border-b separadora) |

### Mudanças exatas

**`HeroCinematic.tsx`**
- Trocar `hidden lg:block` do mockup 3D por `hidden md:block` e reduzir escala em md (max-w-[420px] md, [560px] lg)
- Em md, desligar tilt 3D (peso na CPU mobile) — mockup estático com leve rotação fixa
- Remover `min-h-screen` → trocar por `min-h-[600px] md:min-h-screen`
- `pt-20 pb-32` → `pt-12 pb-16 md:pt-20 md:pb-32`

**`StickyShowcase.tsx`**
- Detectar mobile: se `window.innerWidth < 1024`, renderizar **versão alternativa**: lista vertical das 5 features com mini-mockup acima de cada uma, altura natural (sem sticky, sem scroll-driven). Mantém o conteúdo, mas sem buraco.
- Em desktop, mantém o sticky scroll cinematográfico atual.

**`TimelineSteps.tsx`**
- Em mobile: linha vertical à esquerda (não centralizada), cards alinhados à direita da linha, ícones menores (w-20 h-20), `mb-8` em vez de `mb-16`
- Manter visual desktop intacto

**`Index.tsx` (padding global das seções)**
- Trocar `py-24` por `py-14 md:py-24` em: StackedProblemCards (já tem 24), TimelineSteps, Features, Plans, CTA final
- Trocar `py-20` por `py-12 md:py-20` em Features e Plans
- Trocar `py-16` por `py-10 md:py-16` em Benefit Cards
- Remover `border-b` que isola visualmente a Benefit section quando em mobile (já fica natural)

### Resultado

- Desktop: **idêntico ao atual** (cinematográfico, premium)
- Tablet (768-1023px): mockup do hero aparece, sticky showcase vira lista compacta, padding mais enxuto
- Mobile (≤767px): tudo flui em coluna única sem buracos, linha do tempo lateral, padding adequado

Sem mudar conteúdo, sem mexer no CMS, sem remover efeito nenhum no desktop. Só **fechar os vazios responsivos**.

