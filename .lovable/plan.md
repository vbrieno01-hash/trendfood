

# Pagina de Planos e Precos do TrendFood

## O que sera feito

Criar uma pagina de planos (`/planos`) com 3 opcoes e integrar com o fluxo existente de `subscription_status` da organizacao.

## Estrutura dos planos sugerida

| Plano | Preco | Funcionalidades |
|---|---|---|
| Gratis | R$ 0/mes | Catalogo digital, ate 20 itens no cardapio, 1 ponto de atendimento (QR Code), pedidos por QR Code |
| Pro | R$ 99/mes | Tudo do Gratis + itens ilimitados, pontos ilimitados, painel de producao (KDS), controle de caixa, cupons de desconto, mais vendidos, impressora termica |
| Enterprise | R$ 249/mes | Tudo do Pro + multiplas unidades, relatorios avancados, suporte prioritario, integracao com delivery |

## Arquivos a criar/modificar

### Novos arquivos

| Arquivo | Descricao |
|---|---|
| `src/pages/PricingPage.tsx` | Pagina com os 3 cards de planos, comparativo de funcionalidades e botoes de acao |
| `src/components/pricing/PlanCard.tsx` | Componente reutilizavel para cada card de plano |

### Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `src/App.tsx` | Adicionar rota `/planos` |
| `src/pages/Index.tsx` | Adicionar link "Ver planos" no header e na secao CTA final |
| `src/pages/DashboardPage.tsx` | Atualizar link "Ativar plano" no banner de trial para apontar para `/planos` |

## Design da pagina

- Header com logo e navegacao (mesmo estilo da landing page)
- Titulo "Escolha o plano ideal para seu negocio"
- 3 cards lado a lado (mobile empilhados) com destaque visual no plano Pro (recomendado)
- Cada card tera: nome, preco, lista de funcionalidades com checks, botao de acao
- Plano Gratis: botao "Comecar Gratis" -> `/auth`
- Plano Pro: botao "Comecar Teste Gratis" -> `/auth` (inicia trial)
- Plano Enterprise: botao "Falar com Vendas" -> link WhatsApp
- Secao FAQ embaixo com duvidas comuns
- Footer igual ao da landing page

## Detalhes tecnicos

- Os botoes de acao inicialmente direcionam para `/auth` (cadastro) ou WhatsApp
- A cobranca sera integrada depois (Stripe ou PIX manual) - por enquanto so a pagina visual
- O campo `subscription_status` na tabela `organizations` ja existe e sera usado para controlar o acesso
- Nenhuma mudanca no banco de dados necessaria neste momento
- Estilo seguira o mesmo padrao visual da landing page (cores, tipografia, componentes shadcn/ui)

