

## Nova Aba "Balcão" — Pedido Direto pelo Dono

### O que será feito

Uma nova aba no dashboard onde o dono/atendente pode registrar pedidos de clientes que chegam no balcão. O dono seleciona os itens do cardápio, escolhe o método de pagamento e envia o pedido direto para a cozinha.

### Fluxo

1. Dono abre aba "Balcão" no dashboard
2. Vê o cardápio organizado por categorias (igual ao cardápio público, mas simplificado)
3. Adiciona itens ao carrinho com quantidades
4. Escolhe método de pagamento: **Dinheiro**, **Cartão**, **PIX**
5. Clica "Enviar Pedido" → pedido é criado com `table_number = 0` e aparece na cozinha como "Balcão"
6. Carrinho limpa e está pronto para o próximo cliente

### Arquivos

**1. Criar `src/components/dashboard/CounterTab.tsx`**
- Componente novo com:
  - Lista de itens do cardápio agrupados por categoria (usa `useMenuItems`)
  - Carrinho lateral/inferior com itens selecionados
  - Botões +/- para quantidade
  - Seleção de pagamento (Dinheiro / Cartão / PIX)
  - Campo opcional de observações
  - Botão "Finalizar Pedido" que chama `usePlaceOrder` com `tableNumber: 0`
  - Após enviar, mostra toast de sucesso e limpa o carrinho

**2. Editar `src/pages/DashboardPage.tsx`**
- Adicionar `"counter"` ao `TabKey`
- Importar `CounterTab`
- Adicionar item no grupo "OPERACIONAL" do sidebar: `{ key: "counter", icon: <ShoppingBag />, label: "Balcão" }`
- Renderizar `{activeTab === "counter" && <CounterTab orgId={organization.id} />}`

### Detalhes técnicos

- Reutiliza hooks existentes: `useMenuItems` para listar cardápio, `usePlaceOrder` para criar pedido
- Pedido criado com `table_number: 0` — já tratado na cozinha como "Entrega/Balcão"
- Não precisa de mudança no banco de dados
- Interface otimizada para uso rápido pelo atendente (poucos cliques)

