

## Plano: Atualizar Chat de Suporte, Guia "Como Usar" e Landing Page

Três atualizações para refletir todas as funcionalidades atuais da plataforma.

---

### 1. Chat de Suporte (`supabase/functions/support-chat/index.ts`)

O system prompt atual foca demais em planos/preços e falta orientação prática. Atualizar para:

- **Priorizar ajuda operacional**: como cadastrar itens, configurar mesas, usar o KDS, configurar PIX, usar cupons, abrir/fechar caixa, etc.
- **Adicionar funcionalidades que faltam**: Adicionais/Complementos, Gestão de Insumos (estoque de ingredientes com baixa automática), Precificação (ficha técnica + markup automático), Gestão de Motoboys, Pagamento Online (PIX + cartão via Mercado Pago), Multi-unidade, Onboarding guiado
- **Adicionar seção de troubleshooting**: problemas comuns (pedido não aparece na cozinha, QR code não funciona, impressora não conecta, PIX não confirma)
- **Reduzir peso da seção de planos**: manter info de planos mas não como foco principal
- **Instruir a IA a ser mais tutorial**: quando o usuário perguntar "como faço X?", dar passo a passo em vez de só mencionar que existe

### 2. Guia "Como Usar" (`src/components/dashboard/GuideTab.tsx`)

Adicionar seções que faltam no array `GUIDE_SECTIONS`:

- **Precificação / Ficha Técnica** (Enterprise) — como usar a aba de precificação, cadastrar custos de insumos, ver margem e aplicar preço sugerido
- **Gestão de Insumos / Estoque** (Enterprise) — como cadastrar ingredientes, vincular a itens do cardápio, acompanhar estoque
- **Gestão de Motoboys** — como cadastrar motoboys, atribuir entregas
- **Pagamento Online / PIX** (Pro) — como configurar PIX automático, Mercado Pago
- **Funcionalidades** — menção à aba de funcionalidades para ver o que está disponível
- **Assinatura** — como ver/gerenciar seu plano

### 3. Landing Page (`src/pages/Index.tsx`)

Atualizar o array `features` para incluir funcionalidades novas que faltam:

- **Gestão de Insumos**: controle de ingredientes com ficha técnica e baixa automática
- **Precificação Inteligente**: cálculo automático de margem e preço sugerido por markup
- Atualizar `benefitCards` para refletir melhor o produto atual

### 4. FeaturesTab (`src/components/dashboard/FeaturesTab.tsx`)

Adicionar ao array `FEATURES`:

- **Precificação / Ficha Técnica** (enterprise, available)
- **Delivery Próprio** (pro, available) — já existe como "Integração com Delivery" mas marcado como `coming_soon` no enterprise; corrigir para refletir que delivery próprio já funciona no Pro

---

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/support-chat/index.ts` | Reescrever SYSTEM_PROMPT com foco em ajuda operacional |
| `src/components/dashboard/GuideTab.tsx` | Adicionar ~5 seções ao GUIDE_SECTIONS |
| `src/pages/Index.tsx` | Adicionar 2 features ao array, atualizar benefitCards |
| `src/components/dashboard/FeaturesTab.tsx` | Adicionar Precificação, corrigir Delivery |

