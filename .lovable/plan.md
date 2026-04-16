
## Diferenciar Débito vs Crédito nos pagamentos

### Problema
Hoje o sistema registra apenas `payment_method = "card"` (genérico). Não dá pra saber depois se foi débito ou crédito — isso prejudica fechamento de caixa, conciliação com a maquininha e relatórios fiscais.

### Solução
Criar dois novos métodos: `card_debit` (Débito) e `card_credit` (Crédito), substituindo o `card` genérico em **todos os pontos onde o lojista escolhe forma de pagamento**.

### Onde aparece o botão "Cartão" hoje (precisa virar 2 botões)
1. **WaiterTab** (Gestão de Pedidos / pagar conta) — botão 💳 Cartão
2. **CounterTab** (Balcão / Vendas) — seleção do método ao criar pedido
3. **TableOrderPage** — telas de pagamento da mesa (cliente escolhe)
4. **CaixaTab** (PDV/Caixa) — se houver fluxo similar
5. **CheckoutPage** (delivery online) — manter "Cartão na entrega" virando débito/crédito

### Mudanças

**1. UI — substituir 1 botão "Cartão" por 2 botões "Débito" e "Crédito"**
Onde hoje há `💳 Cartão`, passa a ter:
- `💳 Débito` (azul mais claro) → envia `card_debit`
- `💳 Crédito` (azul escuro/roxo) → envia `card_credit`

**2. Renderização de badges/labels** (KitchenTab, WaiterTab, KitchenPage, HistoryTab, ReceiptPreview, etc.)
Atualizar o switch de label:
```ts
payment_method === "card_debit" → "💳 Débito"
payment_method === "card_credit" → "💳 Crédito"
payment_method === "card"        → "💳 Cartão"   // mantém para compatibilidade com pedidos antigos
```

**3. Recibo térmico** (`receiptData.ts` / `formatReceiptText.ts`)
Imprimir "DEBITO" ou "CREDITO" no campo Pagamento.

**4. Relatórios** (`ReportsTab`, `AdminReportsTab`, exportação CSV do Histórico)
- Adicionar duas linhas separadas no breakdown por método: "Débito" e "Crédito".
- CSV do histórico passa a exportar o valor exato (`Débito`/`Crédito`/`PIX`/`Dinheiro`).

**5. Compatibilidade**
Pedidos antigos com `payment_method = "card"` continuam exibindo "Cartão" — não migrar dados antigos.

### Arquivos afetados
- `src/components/dashboard/WaiterTab.tsx`
- `src/components/dashboard/CounterTab.tsx`
- `src/components/dashboard/CaixaTab.tsx`
- `src/components/dashboard/KitchenTab.tsx`
- `src/components/dashboard/HistoryTab.tsx`
- `src/components/dashboard/ReportsTab.tsx`
- `src/components/admin/AdminReportsTab.tsx`
- `src/pages/KitchenPage.tsx`
- `src/pages/TableOrderPage.tsx`
- `src/components/checkout/CheckoutPage.tsx` (se tiver "Cartão na entrega")
- `src/lib/receiptData.ts` / `src/lib/formatReceiptText.ts`

### Resultado
Lojista clica em **Débito** ou **Crédito** ao receber o pagamento. Essa escolha fica gravada no pedido, aparece no card da Cozinha/Garçom, no recibo impresso, no histórico e nos relatórios — permitindo conciliar com a maquininha (que separa débito de crédito).
