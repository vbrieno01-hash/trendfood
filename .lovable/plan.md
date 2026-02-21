
# Notificacao ao cliente quando o motoboy aceitar a entrega

## Resumo

O fluxo atual ja exige que o motoboy aceite a entrega manualmente -- a entrega fica com status "pendente" ate ele clicar em "Aceitar Entrega". Nao vai sozinho. Isso esta correto.

O que vamos adicionar: quando o motoboy aceitar a entrega, o sistema vai abrir automaticamente uma mensagem no WhatsApp para o cliente avisando que o pedido esta a caminho.

## Como funciona hoje

1. Cozinha marca pedido como "Pronto" -> cria registro na tabela `deliveries` com status `pendente`
2. Motoboy ve a entrega no painel e clica "Aceitar Entrega" -> status muda para `em_rota`
3. Motoboy clica "Marcar como Entregue" -> status muda para `entregue`

O motoboy TEM que aceitar. Nada e automatico.

## O que muda

### Arquivo: `src/pages/CourierPage.tsx`

Quando o motoboy clicar em "Aceitar Entrega" (funcao `handleAccept`), apos a mutacao ter sucesso:

1. Extrair o telefone do cliente das notas do pedido (campo `TEL:` no formato pipe-separated)
2. Buscar o nome da loja (ja disponivel em `orgName`)
3. Abrir o WhatsApp com uma mensagem pre-pronta tipo:

> "Ola! Seu pedido da [Nome da Loja] saiu para entrega! Aguarde em seu endereco que ja estamos a caminho. Obrigado!"

### Arquivo: `src/hooks/useCourier.ts`

Atualizar o `useAcceptDelivery` para tambem buscar os dados do pedido (notes) ao aceitar, retornando o telefone do cliente para que a pagina possa abrir o WhatsApp.

### Arquivo: `src/hooks/useCreateDelivery.ts`

Adicionar uma funcao `parsePhoneFromNotes(notes)` para extrair o telefone do campo `TEL:` das notas, similar ao `parseAddressFromNotes` que ja existe.

### Logica de extracao do telefone

O campo `notes` do pedido tem o formato:
```text
TIPO:Entrega|CLIENTE:Joao|TEL:11999999999|END.:Rua X, 123|PGTO:PIX
```

Regex: `/TEL:([^|]+)/` -> extrai "11999999999"

### Fluxo completo apos a mudanca

1. Motoboy clica "Aceitar Entrega"
2. Sistema atualiza status para `em_rota` no banco
3. Sistema busca as notas do pedido original para pegar o telefone
4. Abre o WhatsApp com a mensagem pre-pronta para o cliente
5. Motoboy envia a mensagem (ou edita antes de enviar)

### Detalhes tecnicos

- A busca do pedido e feita via `orders` table usando o `order_id` da delivery
- Se o telefone nao for encontrado nas notas, o WhatsApp nao abre (apenas mostra o toast de sucesso normal)
- O WhatsApp abre via `window.open("https://wa.me/55{telefone}?text=...")` -- mesmo padrao ja usado no projeto
