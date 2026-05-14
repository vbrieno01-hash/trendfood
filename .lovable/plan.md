## Cenários da Homologação iFood — diagnóstico

| # | Cenário | Status atual |
|---|---|---|
| 1 | Pedido agendado + cupom (VOUCHER_ENTGRATIS) | Backend grava `AGENDADO:` e `CUPOM:` no notes ✅. UI só mostra "🕐 Agendado: …". Cupom **não fica visível** de forma legível. |
| 2 | Pedido manual + cancelamento (cartão na entrega) | Botão de cancelar com motivos iFood já pronto (este ciclo) ✅ |
| 3 | Pedido para retirada (TAKEOUT) | Webhook seta `ifood_order_type = TAKEOUT` ✅. Chip mostra "Aguardando cliente retirar". OK. |
| 4 | Cancelamento iniciado pelo iFood | `ifood-handle-cancellation` + botões Aceitar/Recusar no chip ✅ |
| 5 | Pagamento dinheiro com troco + obs + CPF/CNPJ | Backend grava `PGTO:Dinheiro\|TROCO:…\|CPF:…\|OBS:…` ✅. UI mostra tudo concatenado em uma linha feia: `TIPO:Entrega\|CLIENTE:João\|TROCO:R$ 50,00\|CPF:123…` ❌ |

**Diagnóstico**: o backend já captura tudo. **O problema é a UI da Cozinha** mostrar a string `notes` com pipes em vez de campos rotulados — o avaliador iFood não vai conseguir confirmar visualmente os dados nos vídeos.

## Plano

### 1. Componente `OrderMetadataDisplay.tsx` (novo)

Pega `order.notes`, parseia com o helper existente `parseNotes` (de `src/lib/formatReceiptText.ts`) e renderiza um bloco organizado:

```text
┌────────────────────────────────────────┐
│ 👤 Cliente: João Silva                 │
│ 📞 (11) 98888-0000                     │
│ 🆔 CPF: 123.456.789-00                 │
│ 📍 Rua das Flores, 123 — Centro        │
│ 🕐 Agendado: 15/05 às 19:30            │
│ 💳 Pagamento: Dinheiro                 │
│ 💵 Troco para: R$ 50,00                │
│ 🎟️ Cupom: VOUCHER_ENTGRATIS (-R$ 6,00) │
│ 📝 Obs: sem cebola                     │
└────────────────────────────────────────┘
```

- Usa `parseNotes` já existente (não duplica regex).
- Mostra apenas campos preenchidos.
- Layout em flex, ícones lucide, bg `muted`.

### 2. Substituir o bloco `Obs: {order.notes}` no `KitchenTab.tsx`

Locais: linhas 587-591 (lista pendentes) e 754-758 (lista preparando).

```diff
- {order.notes && (
-   <div className="bg-muted rounded-lg px-3 py-2 text-xs">
-     <span>Obs:</span> {order.notes}
-   </div>
- )}
+ <OrderMetadataDisplay notes={order.notes} />
```

Remover também o "🕐 Agendado" duplicado (linhas 524-528 e 679-683) já que vai aparecer dentro do novo componente.

### 3. Aplicar o mesmo componente em `OperationsTab.tsx` (se renderizar pedidos)

Verificar e padronizar para que ambos os painéis (Cozinha e Operações) mostrem o bloco rico.

### 4. Garantir parse de campos extras

Estender `parseNotes` para incluir, se não tiver: `BAIRRO`, `BANDEIRA`, `COLETA`, `IFOOD_DISPLAY` (já tem AGENDADO, CPF, CNPJ, CUPOM, TROCO, FRETE).

## Resultado para a homologação

- **Cenário 1**: avaliador vê "🕐 Agendado: 15/05 às 19:30" + "🎟️ Cupom: VOUCHER_ENTGRATIS" no card.
- **Cenário 2**: já funciona (botão cancelar com motivos iFood).
- **Cenário 3**: avaliador vê chip "Retirada — Aguardando cliente retirar" + código de coleta.
- **Cenário 4**: já funciona (botões aceitar/recusar quando iFood pede cancelamento).
- **Cenário 5**: avaliador vê "💳 Dinheiro", "💵 Troco para: R$ X", "🆔 CPF: Y", "📝 Obs: Z" claramente separados.

## Arquivos

- **Novo**: `src/components/dashboard/OrderMetadataDisplay.tsx`
- **Editado**: `src/components/dashboard/KitchenTab.tsx` (substituir 2 blocos)
- **Editado**: `src/lib/formatReceiptText.ts` (estender `parseNotes` se faltar campo)
- **Editado** (se aplicável): `src/components/dashboard/OperationsTab.tsx`

Sem mudanças de banco, sem mudanças de Edge Functions.
