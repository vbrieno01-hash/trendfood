

## Plano — Auditoria de botões da landing page (`/`)

### Inventário e status

**Header (HeroCinematic)**
- Logo "TrendFood" — ❌ **não é clicável** (não envolve em `<Link>`)
- Recursos → `#funcionalidades` ✅
- Preços → `/planos` ✅
- Entrar → `/auth` ✅
- Começar Agora → `/auth` ✅

**Hero body**
- CTA "Começar Grátis" → `/auth` ✅

**SavingsCalculator**
- Slider, input, presets ✅
- CTA "Começar Grátis" → `/auth` ✅

**CTA final**
- "Começar Grátis Agora" → `/auth` ✅

**Footer**
- Instagram, WhatsApp, email ✅
- Funcionalidades, Planos, Como Funciona, Calculadora, Comparativo ✅ (todas as âncoras existem: `#funcionalidades`, `#planos`, `#como-funciona`, `#calculadora`, `#comparativo`)
- Termos, Privacidade, WhatsApp ✅
- ⚠️ **"Perguntas Frequentes" → `#problemas`** — leva para a seção "Você já passou por isso?", que não é FAQ. Label enganoso.

### Correções a aplicar

**1. Tornar a logo do header clicável** (`src/components/landing/HeroCinematic.tsx`)
- Envolver o bloco `<img + span TrendFood>` em `<Link to="/">` para padrão de UX consistente (logo sempre volta pra home/topo)
- Manter classes visuais; apenas adicionar `hover:opacity-90 transition-opacity`

**2. Corrigir o link "Perguntas Frequentes"** (`src/pages/Index.tsx`)
- Substituir o item `<li><a href="#problemas">Perguntas Frequentes</a></li>` por:
  - **Label:** "Problemas Comuns"
  - **Destino:** `#problemas` (mesma âncora, agora com label coerente com a seção real)
- Alternativa rejeitada: criar uma FAQ nova — fora de escopo desta auditoria

### Resultado esperado

- Todos os botões/links da landing funcionam e levam ao destino correto e coerente com o label
- Logo do header passa a ser clicável (padrão web esperado)
- Footer deixa de prometer FAQ que não existe

### Arquivos
- `src/components/landing/HeroCinematic.tsx` (logo clicável)
- `src/pages/Index.tsx` (label do item "Perguntas Frequentes")

