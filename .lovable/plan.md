

## Plano: Atualizar textos de benefícios dos planos

### Onde os dados estão
Os benefícios dos planos vêm da tabela `platform_plans` no banco de dados (coluna `features` do tipo JSONB). São carregados dinamicamente tanto na `PricingPage` quanto no `UpgradeDialog`. Portanto, basta atualizar o banco.

### Implementação

**1. Migration SQL** — atualizar a coluna `features` de cada plano:

- **Grátis** (`key = 'free'`): substituir features por:
  - Catálogo digital
  - Até 20 itens no cardápio
  - 1 ponto de atendimento (QR Code)
  - Pedidos por QR Code
  - Link compartilhável do catálogo
  - Pagamento apenas na entrega
  - Selo TrendFood no rodapé

- **Pro** (`key = 'pro'`): substituir features por:
  - Tudo do plano Grátis
  - Itens ilimitados no cardápio
  - Pontos de atendimento ilimitados
  - Adicionais ilimitados
  - Pagamento Online (PIX/Cartão)
  - Retirada da marca TrendFood
  - Painel de Produção (KDS)
  - Controle de Caixa completo
  - Cupons de desconto
  - Ranking de mais vendidos
  - Impressora térmica 80mm
  - Painel do Atendente

- **Enterprise** (`key = 'enterprise'`): substituir features por:
  - Tudo do plano Pro
  - Múltiplas unidades
  - Gestão de Insumos/Ficha Técnica
  - Baixa automática de estoque
  - Relatórios avançados
  - Suporte prioritário
  - Gerente de conta dedicado

Nenhuma alteração de código é necessária — o `PlanCard` já renderiza a lista `features` dinamicamente.

