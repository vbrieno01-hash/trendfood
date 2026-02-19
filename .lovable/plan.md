
# QR Code PIX no Comprovante de Impressão

## Visão geral

Quando o lojista clicar em imprimir (automático ou manual), o comprovante vai exibir:
- Total do pedido (soma de quantidade × preço de cada item)
- QR Code PIX gerado automaticamente com o valor exato
- Chave PIX configurável pelo dono da loja no painel

Se a loja não tiver uma chave PIX cadastrada, o comprovante é impresso normalmente, sem QR code.

---

## O que será adicionado

### 1. Campo "Chave PIX" no banco e no painel

Uma nova coluna `pix_key` na tabela `organizations` (texto, nullable).

No painel → aba **Perfil da Loja**, uma nova seção "Pagamentos" com um campo para o dono informar sua chave PIX (CPF, CNPJ, e-mail, telefone ou chave aleatória).

### 2. Preço dos itens no comprovante

Atualmente o `PrintableOrder` só carrega `{ id, name, quantity }` por item — sem preço. O `OrderItem` já tem `price`. Será adicionado `price` ao tipo `PrintableOrder.order_items`, e todas as chamadas a `printOrder` já passam objetos `Order` que contêm `order_items` completos (com preço), então basta atualizar a interface.

### 3. Gerador de payload PIX (sem dependência externa)

Uma função pura `buildPixPayload(pixKey, amount, storeName)` será criada diretamente no código. O payload segue o padrão EMV usado pelo Banco Central (o mesmo que todos os bancos e apps de pagamento reconhecem). Inclui CRC16 para validação.

### 4. QR Code gerado localmente

Será instalado o pacote `qrcode` (já existe como dependência indireta via `qrcode.react`, mas precisa ser declarado diretamente). Ele converte o payload PIX em uma imagem PNG em base64 que é embutida diretamente no HTML do comprovante — funciona offline, sem APIs externas.

### 5. Layout final do comprovante atualizado

```text
┌──────────────────────────┐
│      BURGUER DO REI      │
│  ────────────────────────│
│  MESA 5       19/02 14:32│
│  ────────────────────────│
│  2x  X-Burguer           │
│  1x  Batata Frita        │
│  1x  Coca-Cola           │
│  ────────────────────────│
│  TOTAL: R$ 54,90         │
│  ────────────────────────│
│  [████ QR CODE PIX ████] │
│   Pague com Pix           │
│  ────────────────────────│
│  ★ novo pedido — kds ★   │
└──────────────────────────┘
```

---

## Arquivos afetados

| Arquivo | O que muda |
|---|---|
| Migração SQL | Adiciona coluna `pix_key text` em `organizations` |
| `src/hooks/useOrganization.ts` | Adiciona `pix_key` na interface `Organization` |
| `src/components/dashboard/StoreProfileTab.tsx` | Seção "Pagamentos" com campo de chave PIX |
| `src/lib/printOrder.ts` | Adiciona `price` em `order_items`, calcula total, gera payload PIX e QR code |
| `src/pages/KitchenPage.tsx` | Passa `org.pix_key` para `printOrder` |
| `src/components/dashboard/KitchenTab.tsx` | Idem — passa `pixKey` recebido como prop |
| `src/pages/DashboardPage.tsx` | Passa `organization.pix_key` para `KitchenTab` |

---

## Detalhes técnicos

### Pacote adicionado
- `qrcode` — gera QR code como data URL (`await QRCode.toDataURL(pixPayload)`)

### Assinatura atualizada de `printOrder`
```typescript
printOrder(order, storeName?, pixKey?)
```

O QR code só aparece se `pixKey` estiver preenchida E o pedido tiver itens com preço.

### Payload PIX (padrão Banco Central)
A função `buildPixPayload` gera o string EMV completo com CRC16 — compatível com qualquer app de pagamento PIX (Nubank, PicPay, bancos, etc.).
