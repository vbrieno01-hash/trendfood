

# Plano: Página de Checkout personalizada na pasta `checkout`

## Resumo

Criar um componente `CheckoutPage.tsx` em `src/components/checkout/` com design mobile-first, usando o design system existente (Card, Button, Input, RadioGroup, etc.) e as cores da marca Trendfood (primary vermelho/laranja).

## Novo arquivo: `src/components/checkout/CheckoutPage.tsx`

Componente standalone que recebe via props os itens do carrinho e callbacks. Estrutura:

### Layout
- Mobile-first, single column em telas pequenas
- Em desktop (`md:`), duas colunas: formulário à esquerda, resumo do pedido à direita (sticky)

### Seções

1. **Resumo do pedido** (Card lateral/topo)
   - Lista de itens com nome, qtd, preço unitário e subtotal
   - Separador + linha de total em destaque
   - Usa `ScrollArea` se muitos itens

2. **Formulário de dados** (Card principal)
   - Campo Nome (Input, obrigatório)
   - Campo WhatsApp (Input com máscara `formatPhone` já existente no projeto)
   - Campo Endereço (Input, simplificado — apenas texto livre para este componente standalone)

3. **Seleção de pagamento** (RadioGroup)
   - Opções: `pix`, `cartao`, `entrega`
   - Labels com ícones Lucide: `QrCode`, `CreditCard`, `Banknote`
   - Cards clicáveis com borda highlight na seleção

4. **Placeholder PIX condicional**
   - Quando `pix` selecionado, exibe Card com ícone `QrCode` grande (placeholder 256x256) e texto "QR Code será gerado ao confirmar"

5. **Botão Finalizar Pedido**
   - Cor `primary` (vermelho Trendfood), full-width, com validação básica dos campos

### Props
```typescript
interface CheckoutPageProps {
  items: { id: string; name: string; price: number; qty: number }[];
  onConfirm: (data: { name: string; phone: string; address: string; payment: string }) => void;
  onBack: () => void;
}
```

## Arquivos

```
CREATE: src/components/checkout/CheckoutPage.tsx
```

Nenhuma alteração em rotas ou outras páginas — o componente fica disponível para ser integrado onde necessário.

