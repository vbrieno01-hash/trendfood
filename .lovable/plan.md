

## Integração Completa com iFood (Pedidos + Cardápio)

### Realidade sobre a API do iFood

O iFood disponibiliza uma **API oficial para parceiros (iFood Merchant API)** que permite:
- Receber pedidos em tempo real via webhooks
- Gerenciar cardápio (criar/atualizar itens, preços, disponibilidade)
- Confirmar/recusar pedidos
- Atualizar status de preparo e entrega

**Porém**, para acessar essa API, é necessário:

1. **Cadastro como parceiro integrador** no portal [iFood Developer](https://developer.ifood.com.br/)
2. **Aprovação do iFood** — eles revisam o sistema antes de liberar credenciais de produção
3. **Client ID + Client Secret** — credenciais OAuth2 fornecidas após aprovação
4. **Merchant ID** — cada loja do iFood tem um ID único que precisa ser vinculado

### O que precisa ser feito (etapas)

#### Fase 0 — Pré-requisito (sua parte)
- Criar conta no [iFood Developer Portal](https://developer.ifood.com.br/)
- Solicitar acesso à API como integrador
- Aguardar aprovação e receber Client ID + Client Secret
- **Sem essas credenciais, não é possível avançar tecnicamente**

#### Fase 1 — Autenticação e Vinculação (após aprovação)
- Edge function para gerar/renovar token OAuth2 do iFood
- Tela no dashboard para o dono vincular sua loja iFood (informar Merchant ID)
- Tabela `ifood_credentials` para armazenar tokens por organização

#### Fase 2 — Receber Pedidos do iFood
- Edge function webhook para receber eventos de novos pedidos
- Converter pedido iFood → formato de pedido do TrendFood
- Pedido aparece na cozinha/gestão como qualquer outro, com badge "iFood"
- Confirmar/recusar pedido de volta pro iFood via API
- Atualizar status (preparando → pronto → entregue) sincronizado

#### Fase 3 — Sincronizar Cardápio
- Publicar itens do TrendFood no iFood (nome, descrição, preço, foto, disponibilidade)
- Sincronizar alterações (desativar item, mudar preço)
- Mapear categorias do TrendFood → categorias do iFood

### Estimativa de esforço
- Fase 0: depende do iFood (dias a semanas)
- Fase 1: ~2-3 horas de desenvolvimento
- Fase 2: ~4-6 horas
- Fase 3: ~4-6 horas

### Próximo passo concreto
Você precisa **criar a conta no iFood Developer Portal** e solicitar acesso como integrador. Me avise quando tiver as credenciais (Client ID e Client Secret) que eu implemento toda a integração técnica.

Quer que eu já prepare a estrutura base (tabelas, telas de configuração) enquanto você faz o cadastro no portal?

