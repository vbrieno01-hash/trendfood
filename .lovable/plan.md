
# Adicionar indicador de plano necessario nos cards de Funcionalidades

## O que muda

Cada card de funcionalidade na aba "Funcionalidades" do painel Admin passa a mostrar qual plano minimo eh necessario para acessar aquela feature. Isso ajuda o admin a visualizar rapidamente o que cada plano desbloqueia.

## Como vai ficar

Cada card tera uma badge adicional indicando o plano minimo:
- **Todos** (verde) — disponivel em todos os planos, incluindo Free
- **Pro** (laranja/primary) — disponivel a partir do Pro
- **Enterprise** (roxo) — exclusivo Enterprise

Features e seus planos minimos:
- Suporte via WhatsApp → Todos
- Impressora Termica → Pro
- Onboarding Guiado → Todos
- Controle de Caixa → Pro
- (futuras features como KDS, Cupons, Garcom → Pro; Multi-unidade → Enterprise)

## Detalhes tecnicos

### Arquivo: `src/pages/AdminPage.tsx`

1. Adicionar campo `minPlan` na interface `Feature` com valores `"free" | "pro" | "enterprise"`
2. Atualizar cada item do array `FEATURES` com o `minPlan` correspondente
3. No componente `FeatureCard`, renderizar uma badge extra ao lado do status mostrando o plano minimo necessario, com cores distintas:
   - free: badge verde "Todos os planos"
   - pro: badge primary "Pro+"
   - enterprise: badge roxa "Enterprise"

Nenhuma dependencia nova. Nenhuma alteracao no banco de dados. Usa apenas componentes e estilos ja existentes no projeto.
