# Limite: 1 instância por loja

## Regra
- Cada `organization` (loja/unidade) pode ter **1 instância** de WhatsApp ativa.
- Se o usuário criar uma nova unidade, ele ganha direito a +1 instância automaticamente.
- Admin (`brenojackson30@gmail.com`) continua bypassando.

## Mudanças

### 1. Edge function `uazapi-create-instance`
- Remover a contagem por `user_id` (limite de 3).
- Adicionar contagem por `organization_id`:
  - Buscar instâncias ativas em `whatsapp_instances` onde `organization_id = <orgAtual>`.
  - Se já houver ≥1, retornar **403** com mensagem: *"Esta loja já tem uma instância de WhatsApp conectada. Para conectar outro número, crie uma nova unidade."*
- Admin bypassa a checagem.

### 2. Frontend `WhatsAppInstancesTab` (ou onde fica o botão "Conectar WhatsApp")
- Antes de chamar a edge, verificar se já existe instância na loja atual.
- Se sim, esconder/desabilitar o botão "Conectar nova instância" e mostrar aviso:
  *"Esta loja já tem WhatsApp conectado. Para conectar outro número, crie uma nova unidade no menu Unidades."*
- Botão "Criar nova unidade" → leva pra tela de multi-unit existente.

### 3. Não muda
- `ai_bot_config` por `organization_id` (multi-tenant já implementado).
- `fila_whatsapp` por `organization_id`.
- Gate de plano Free (continua bloqueando ativar bot).
- Fluxo de criação de organization (já existente).

## Detalhes técnicos
- A checagem usa `whatsapp_instances` filtrando por `organization_id` e status diferente de `disconnected`/`deleted` (instâncias órfãs/desconectadas não contam, pra permitir reconectar).
- Caso o usuário delete a instância, libera o slot da loja imediatamente.
