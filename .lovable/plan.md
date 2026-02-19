
# Cardápio Digital de Vendas — Carrinho + WhatsApp + Assinatura

## Contexto do que já existe

A UnitPage já exibe o cardápio com foto/descrição/preço. Hoje, cada item tem um botão "Pedir" que abre o WhatsApp individualmente. A MenuTab no Dashboard já permite gerenciar produtos.

O que falta:
1. Substituir o botão "Pedir" por item por um botão "Adicionar ao Carrinho"
2. Carrinho flutuante que acumula os itens escolhidos
3. Modal de finalização com Nome, Endereço e Forma de Pagamento
4. Mensagem formatada para o WhatsApp com todo o pedido
5. Campo `subscription_status` na tabela `organizations` para controle de acesso ao Dashboard

---

## 1 — Banco de Dados: `subscription_status`

Adicionar coluna `subscription_status` na tabela `organizations`:

```sql
ALTER TABLE organizations
  ADD COLUMN subscription_status text NOT NULL DEFAULT 'trial';
```

Valores possíveis: `'trial'` (acesso padrão para novos cadastros) | `'active'` (plano pago) | `'inactive'` (bloqueado).

Não há mudanças de RLS — a coluna é consultada via `useAuth` que já carrega a organização completa do dono autenticado.

---

## 2 — UnitPage: Carrinho Flutuante + Finalização via WhatsApp

### Mudanças no comportamento

O botão "Pedir" (WhatsApp individual por item) será substituído por:
- Botão **"+ Adicionar"** em cada card de produto
- Um **carrinho flutuante fixo** no rodapé mostrando quantidade de itens e valor total
- Ao clicar no carrinho, abre um **drawer/modal de finalização** com:
  - Resumo dos itens (nome, qtd, preço unitário, subtotal)
  - Campo **Nome** (texto)
  - Campo **Endereço** (texto, para delivery — se aplicável)
  - Campo **Forma de Pagamento** (select: Dinheiro, Cartão de Débito, Cartão de Crédito, PIX)
  - Campo **Observações** (opcional)
  - Botão **"Enviar pelo WhatsApp"** — monta e abre a mensagem formatada

### Mensagem formatada para WhatsApp

```
🍔 *Novo Pedido — Burger Palace*

📋 *Itens:*
• 2x Burguer Classic — R$ 51,80
• 1x Coca-Cola — R$ 8,00

💰 *Total: R$ 59,80*

👤 *Nome:* João Silva
🏠 *Endereço:* Rua das Flores, 123
💳 *Pagamento:* PIX

📝 *Obs:* Sem cebola no burger
```

### Estado local do carrinho

O carrinho vive em `useState` na `UnitPage` — sem persistência, sem banco de dados. Ao finalizar, abre `wa.me/55{whatsapp}?text={encodedMessage}` em nova aba.

Condição: o botão "Enviar pelo WhatsApp" só aparece se o `org.whatsapp` estiver cadastrado. Caso contrário, exibe mensagem "Configure o WhatsApp no painel do lojista".

---

## 3 — DashboardPage: Gate de Assinatura

No `DashboardPage`, após carregar a `organization`, verificar o `subscription_status`:

- `'active'` → acesso total ao dashboard (comportamento atual)
- `'trial'` → acesso total com um **banner informativo** no topo: "Você está no período de teste."
- `'inactive'` → bloquear o dashboard inteiro, exibir uma tela de paywall:

```text
┌─────────────────────────────────────────────┐
│  🔒 Sua assinatura está inativa             │
│                                             │
│  Para continuar usando o painel, ative      │
│  seu plano. Entre em contato conosco.       │
│                                             │
│  [Falar no WhatsApp]    [Sair]              │
└─────────────────────────────────────────────┘
```

O `subscription_status` virá da `organization` já carregada pelo `useAuth` — sem nova query necessária.

---

## 4 — HomeTab: Atualizar descrição

Mudar o subtítulo do HomeTab de "Aqui está um resumo das suas sugestões" para incluir também o status da assinatura em um badge discreto.

---

## Resumo dos arquivos afetados

| Arquivo | Ação |
|---|---|
| Migration SQL | Adicionar `subscription_status` em `organizations` |
| `src/pages/UnitPage.tsx` | Refatorar cardápio: carrinho local + drawer de finalização + mensagem WhatsApp |
| `src/pages/DashboardPage.tsx` | Adicionar gate de assinatura baseado em `subscription_status` |
| `src/components/dashboard/HomeTab.tsx` | Badge de status da assinatura no cabeçalho |
| `src/hooks/useAuth.tsx` | Adicionar `subscription_status` ao tipo `Organization` |

Nenhuma mudança em: `MenuTab`, `TablesTab`, `KitchenPage`, `WaiterPage`, `MuralTab`, rotas.

---

## Detalhes do carrinho na UnitPage

### Estado

```typescript
type CartItem = { id: string; name: string; price: number; qty: number; };
const [cart, setCart] = useState<Record<string, CartItem>>({});
const [checkoutOpen, setCheckoutOpen] = useState(false);
```

### Componentes visuais

1. **Card de produto** — botão `[+]` (se qty = 0) ou `[−] N [+]` (se qty > 0)
2. **Barra flutuante** — aparece quando `totalItems > 0`:
   - `🛒 3 itens — R$ 59,80` → `[Ver pedido →]`
3. **Drawer de finalização** (usa o `Drawer` do vaul que já está instalado):
   - Lista de itens com subtotal
   - Inputs: Nome*, Endereço, Forma de Pagamento (Select), Observações
   - Botão verde `Enviar pelo WhatsApp` com ícone do WhatsApp

### Validação

- Nome é obrigatório para enviar
- Forma de Pagamento deve ser selecionada
- Se `org.whatsapp` não estiver cadastrado, exibe alerta em vez do botão

---

## O que NÃO muda

- `TableOrderPage` (fluxo de pedido interno por mesa — sem WhatsApp)
- `KitchenPage`, `WaiterPage`
- `MenuTab` (gestão de produtos no dashboard)
- `MuralTab`, `StoreProfileTab`, `SettingsTab`
- Sistema de auth e rotas
