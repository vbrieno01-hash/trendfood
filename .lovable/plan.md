

# Nome por pedido + Pagamento na hora (Mesa)

## Resumo

Duas melhorias no fluxo de pedido presencial (`TableOrderPage`):

1. **Nome do cliente em cada item** -- Para mesas com varias pessoas, cada um informa seu nome ao adicionar itens. A cozinha e o garcom sabem exatamente quem pediu o que.

2. **Pagamento via PIX na hora** -- Apos finalizar o pedido, o cliente ve um QR Code PIX com o valor total para pagar imediatamente pelo celular.

---

## Detalhes tecnicos

### 1. Nome por item no carrinho

**Banco de dados** -- Adicionar coluna `customer_name` na tabela `order_items`:

```sql
ALTER TABLE order_items ADD COLUMN customer_name text;
```

**Frontend (`TableOrderPage.tsx`):**
- Adicionar um campo "Seu nome" no topo da pagina (abaixo do header), salvo em estado `customerName`
- Ao adicionar itens ao carrinho, gravar o `customerName` junto com cada item
- A interface do carrinho mostra os itens agrupados por nome: "Joao: 1x X-Burger, 1x Coca" / "Maria: 1x Salada"
- O campo de nome e obrigatorio antes de adicionar o primeiro item

**CartItem atualizado:**
```typescript
interface CartItem {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  customer_name: string;  // novo
}
```

**Hook `usePlaceOrder`** -- Incluir `customer_name` ao inserir `order_items`.

**KitchenTab e WaiterTab** -- Exibir o nome do cliente ao lado de cada item (ex: "2x X-Burger -- Joao").

**Impressao (`printOrder.ts`)** -- Incluir o nome do cliente na linha de cada item impresso.

### 2. Pagamento PIX na tela de sucesso

**Tela de sucesso (`TableOrderPage.tsx`):**
- Apos enviar o pedido, exibir o QR Code PIX usando a funcao `buildPixPayload` ja existente em `printOrder.ts`
- Extrair a logica de geracao do payload PIX para uma funcao reutilizavel
- Usar `qrcode.react` (ja instalado) para renderizar o QR inline na tela
- Mostrar o valor total e instrucoes "Aponte a camera do seu banco para pagar"
- Botao "Copiar codigo PIX" para colar no app do banco

**Requisito:** A organizacao precisa ter `pix_key` configurado. Se nao tiver, a tela de sucesso mostra apenas a confirmacao normal sem QR.

### Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `order_items` (banco) | Adicionar coluna `customer_name` |
| `src/pages/TableOrderPage.tsx` | Campo nome, carrinho por pessoa, tela PIX |
| `src/hooks/useOrders.ts` | Incluir `customer_name` no insert e interface |
| `src/components/dashboard/KitchenTab.tsx` | Mostrar nome do cliente nos itens |
| `src/components/dashboard/WaiterTab.tsx` | Mostrar nome do cliente nos itens |
| `src/lib/printOrder.ts` | Extrair `buildPixPayload`, nome no item |

