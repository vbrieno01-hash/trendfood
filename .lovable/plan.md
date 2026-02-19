
# Bloquear Pedidos Quando a Loja Está Fechada

## Diagnóstico

O badge "Fechado · abre às..." está aparecendo corretamente no banner da loja, mas os clientes ainda conseguem:
- Clicar em "Add" e adicionar itens ao carrinho
- Abrir o drawer de checkout
- Enviar o pedido pelo WhatsApp

Isso acontece porque a variável `storeStatus` calculada pelo `getStoreStatus()` é usada apenas para exibir o badge visual — ela não está conectada a nenhuma lógica de bloqueio.

## O que será mudado

Arquivo único: `src/pages/UnitPage.tsx`

### 1. Calcular o status da loja no nível do componente

Atualmente o `getStoreStatus(org.business_hours)` é chamado dentro do JSX (inline no banner). Ele será movido para uma constante no início da função do componente, assim pode ser reutilizado em toda a página:

```typescript
const storeStatus = getStoreStatus(org.business_hours);
const isClosed = storeStatus !== null && !storeStatus.open;
```

### 2. Bloquear botão "Add" nos cards do cardápio

Quando `isClosed === true`, o botão "Add" e o controle de quantidade são substituídos por um indicador visual de bloqueio (ícone de cadeado ou texto "Fechado").

```
item.available && !isClosed  →  mostra botão Add / controle de qty
item.available && isClosed   →  mostra chip "🔒 Fechado" cinza, sem interação
```

### 3. Bloquear o drawer de detalhe do item

No drawer de detalhe do item (quando o cliente clica na foto), o botão "Adicionar ao carrinho" é desabilitado e mostra uma mensagem:

```
isClosed → botão substituído por aviso "Loja fechada · Pedidos indisponíveis"
```

### 4. Bloquear o botão flutuante do carrinho (barra inferior)

A barra flutuante de checkout (`totalItems > 0`) só aparece quando há itens — mas se a loja fechar enquanto o cliente ainda tem itens no carrinho, ele ainda consegue abrir o checkout. O botão será desabilitado e mostrará aviso quando `isClosed`.

### 5. Bloquear o botão de envio no checkout drawer

Mesmo que o drawer de checkout seja aberto (ex: itens que já estavam no carrinho), o botão "Enviar Pedido pelo WhatsApp" será desabilitado com uma mensagem clara:

```
🔒 Loja fechada · abre às 15:00
```

### 6. Aviso de loja fechada no banner (melhorar o existente)

O badge atual está no canto superior direito do banner. Quando fechada, será adicionado também um aviso textual abaixo da descrição da loja para ficar mais visível:

```
🔒 Loja fechada no momento · Pedidos não estão disponíveis
   Abre às 15:00 (ou "Abre amanhã")
```

---

## Resumo visual

```text
FECHADA:
┌─────────────────────────────────────────┐
│ Burger do Rei        [Fechado · 15:00]  │
│ Melhores lanches...                     │
│ 🔒 Loja fechada · pedidos indisponíveis │
└─────────────────────────────────────────┘

Cards do cardápio:
┌──────────┐
│  [foto]  │
│  Duplo   │
│  R$36    │
│ [Fechado]│  ← botão desabilitado, cinza
└──────────┘
```

---

## Arquivos afetados

| Arquivo | O que muda |
|---|---|
| `src/pages/UnitPage.tsx` | Toda a lógica de bloqueio descrita acima |

Nenhuma mudança de banco, rotas ou outros componentes.
