
# Funcionalidades visíveis para todas as lojas + Guia de uso do app

## Resumo

Duas mudanças principais:

1. **Aba "Funcionalidades"** no dashboard de todas as lojas -- mostra todas as features da plataforma com badges indicando o plano necessário e se a loja tem acesso ou não (baseado no plano atual dela).

2. **Aba "Como Usar"** (Guia) no dashboard -- uma página única com explicações de cada seção do app (Cardápio, Mesas, Cozinha/KDS, Garçom, Caixa, Cupons, Mais Vendidos, Histórico, Perfil da Loja, Configurações). Cada explicação será um accordion expansível com descrição, passo a passo e dicas.

---

## 1. Aba "Funcionalidades" no Dashboard

Adiciona uma nova aba no sidebar do dashboard chamada "Funcionalidades" com ícone de Rocket/Zap.

Cada card de feature mostrará:
- Ícone, título e descrição
- Badge do plano mínimo (Todos, Pro+, Enterprise)
- Badge de status (Disponível, Beta, Em breve)
- Se o plano da loja NÃO cobre aquela feature: overlay com cadeado + botão "Fazer upgrade"
- Se o plano da loja cobre: botão de ação normal

As features listadas serão as mesmas do admin (Suporte WhatsApp, Impressora Térmica, Onboarding, Controle de Caixa) + features do `usePlanLimits` (KDS, Cupons, Mais Vendidos, Garçom, Multi-unidade).

## 2. Aba "Como Usar" (Guia do App)

Adiciona uma nova aba no sidebar chamada "Como Usar" com ícone de BookOpen/HelpCircle.

Conteúdo: uma lista de accordions (usando o componente Accordion já existente), cada um explicando uma seção do app:

- **Home** -- Visão geral dos pedidos do dia, resumo rápido
- **Meu Cardápio** -- Como adicionar, editar e organizar itens e categorias
- **Mesas** -- Como criar mesas e gerar QR Codes para clientes
- **Histórico** -- Como consultar pedidos anteriores
- **Cupons** (Pro+) -- Como criar e gerenciar cupons de desconto
- **Mais Vendidos** (Pro+) -- Como visualizar relatórios de vendas
- **Cozinha / KDS** (Pro+) -- Como usar o painel de produção em tempo real
- **Garçom** (Pro+) -- Como gerenciar pedidos pelo painel do garçom
- **Caixa** (Pro+) -- Como abrir/fechar caixa e registrar sangrias
- **Perfil da Loja** -- Como configurar nome, logo, endereço, horários
- **Configurações** -- Como configurar Pix, cores e preferências

---

## Detalhes técnicos

### Arquivos novos

- `src/components/dashboard/FeaturesTab.tsx` -- Componente da aba Funcionalidades, reutiliza a mesma estrutura de dados (FEATURES, FeatureCard) mas adaptada para o contexto da loja, recebendo `planLimits` como prop para mostrar acesso/bloqueio.

- `src/components/dashboard/GuideTab.tsx` -- Componente da aba "Como Usar" com accordions explicativos de cada seção.

### Arquivo editado

- `src/pages/DashboardPage.tsx`:
  - Adicionar `"features"` e `"guide"` ao tipo `TabKey`
  - Adicionar dois novos itens no sidebar (navItemsBottom, antes de Perfil/Configurações)
  - Renderizar `<FeaturesTab>` e `<GuideTab>` no switch de tabs

### Sem alterações no banco de dados

Nenhuma migration, nenhuma dependência nova. Usa apenas componentes já existentes (Accordion, Badge, Button, Card, Lock icon).
