
# Automação PIX por loja - Cada dono configura seu gateway

## Resumo

Habilitar a opção "Automático (API)" nas configurações de cada loja, permitindo que o dono escolha seu gateway de pagamento (Mercado Pago, PagSeguro, ou outro) e coloque seu próprio token/Access Token. Quando um pedido PIX for feito, o sistema gera a cobrança automaticamente pelo gateway da loja e verifica o pagamento.

## Como vai funcionar para o lojista

1. Nas configurações, seleciona "Automático (API)"
2. Escolhe o gateway (Mercado Pago, PagSeguro, etc.)
3. Cola o Access Token da conta dele no gateway
4. Pronto -- os pedidos PIX agora geram QR Code dinâmico e são confirmados automaticamente

## Detalhes tecnicos

### 1. Banco de dados

Adicionar colunas na tabela `organizations` para guardar as configurações do gateway de cada loja:

```sql
ALTER TABLE public.organizations
  ADD COLUMN pix_gateway_provider text DEFAULT NULL,
  ADD COLUMN pix_gateway_token text DEFAULT NULL;
```

- `pix_gateway_provider`: "mercadopago", "pagseguro", ou null
- `pix_gateway_token`: Access Token do lojista (criptografado em transito, armazenado no banco com RLS protegendo acesso)

O token fica seguro porque a tabela `organizations` so permite UPDATE/SELECT pelo dono (auth.uid() = user_id), e a leitura publica nao expoe o token pois o frontend so busca campos necessarios.

### 2. Interface - `StoreProfileTab.tsx`

Quando o lojista seleciona "Automatico (API)":
- Habilitar o radio button (remover o disabled e opacity-50)
- Mostrar um dropdown para escolher o provedor: Mercado Pago ou PagSeguro
- Mostrar um campo de texto para colar o Access Token
- Mostrar instrucoes breves de onde pegar o token (com link para a documentacao do provedor)
- Salvar `pix_gateway_provider` e `pix_gateway_token` junto com o `pix_confirmation_mode`

### 3. Edge Function - `verify-pix-payment`

Nova edge function que:
- Recebe o `organization_id` e dados do pedido
- Busca o `pix_gateway_provider` e `pix_gateway_token` da organizacao (usando service role key)
- Cria uma cobranca PIX no gateway escolhido
- Retorna o QR Code e o ID da cobranca

Endpoints dos gateways:
- **Mercado Pago**: `POST https://api.mercadopago.com/v1/payments` com `payment_method_id: "pix"`
- **PagSeguro**: `POST https://api.pagseguro.com/instant-payments/cob` (API PIX)

### 4. Edge Function - `check-pix-status`

Nova edge function que verifica se o PIX foi pago:
- Recebe `organization_id` e `payment_id` (ID da cobranca no gateway)
- Busca as credenciais da loja
- Consulta o status no gateway
- Se pago, atualiza o pedido de `awaiting_payment` para `pending` (libera pra cozinha)

### 5. Fluxo do pedido (`TableOrderPage.tsx`)

Quando o modo e "automatic" e o cliente escolhe PIX:
1. Pedido criado com status `awaiting_payment`
2. Chama a edge function `verify-pix-payment` para gerar o QR Code dinamico
3. Mostra o QR Code na tela do cliente
4. Um polling (a cada 5 segundos) chama `check-pix-status` para verificar se pagou
5. Quando pagou, atualiza o status para `pending` e mostra confirmacao

### 6. Hooks - `usePixAutomation.ts`

Novo hook com:
- `useCreatePixCharge(orgId)`: cria cobranca PIX via edge function
- `useCheckPixStatus(orgId, paymentId)`: polling do status do pagamento

### 7. Seguranca

- O token do gateway NUNCA e enviado ao frontend -- so e lido pela edge function com service role key
- O campo `pix_gateway_token` e salvo pelo frontend via update normal (protegido por RLS -- so o dono da org pode atualizar)
- A leitura publica da organizacao no `TableOrderPage` nao inclui o token (select especifico de campos, ou o token so e lido no backend)
- Para evitar que o token vaze no select publico, vamos criar uma tabela separada `organization_secrets` com RLS restrito

### 8. Tabela separada para seguranca - `organization_secrets`

Para garantir que o token do gateway nunca vaze em queries publicas:

```sql
CREATE TABLE public.organization_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE,
  pix_gateway_provider text,
  pix_gateway_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.organization_secrets ENABLE ROW LEVEL SECURITY;

-- Somente o dono da org pode ler/escrever
CREATE POLICY secrets_select_owner ON organization_secrets
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = organization_id));

CREATE POLICY secrets_insert_owner ON organization_secrets
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM organizations WHERE id = organization_id));

CREATE POLICY secrets_update_owner ON organization_secrets
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = organization_id));

CREATE POLICY secrets_delete_owner ON organization_secrets
  FOR DELETE USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = organization_id));
```

## Arquivos modificados/criados

| Arquivo | Alteracao |
|---------|-----------|
| Migracao SQL | Criar tabela `organization_secrets` |
| `src/components/dashboard/StoreProfileTab.tsx` | Habilitar modo automatico, campos de provedor e token |
| `src/hooks/useOrganization.ts` | Incluir dados de secrets para o dono |
| `src/hooks/usePixAutomation.ts` | Novo hook para criar cobranca e verificar status |
| `supabase/functions/verify-pix-payment/index.ts` | Edge function para criar cobranca PIX no gateway |
| `supabase/functions/check-pix-status/index.ts` | Edge function para verificar status do pagamento |
| `src/pages/TableOrderPage.tsx` | Integrar QR Code dinamico e polling quando modo automatico |
