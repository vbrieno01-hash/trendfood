
# Tipo de Pedido: Retirada ou Entrega no Checkout Online

## Contexto atual

O checkout da loja pública (`UnitPage`) não distingue se o cliente vai buscar o pedido ou receber em casa. O campo de endereço é sempre exibido (opcional), sem contexto claro. O comprovante impresso sempre exibe "ENTREGA" para pedidos externos (table_number = 0).

## O que será adicionado

Um novo campo obrigatório **"Como você quer receber?"** com duas opções:

- **🛵 Entrega** — exibe os campos de endereço e validação de confirmação
- **🏃 Retirada no local** — oculta os campos de endereço (desnecessários)

Se o cliente selecionar Retirada, o endereço não é exibido nem validado, simplificando o formulário. O tipo de pedido vai para as notas estruturadas e aparece no comprovante impresso.

## Como ficará o fluxo

```text
Checkout abre
       │
       ▼
[Entrega] ou [Retirada no local]  ← novo campo obrigatório
       │
       ├── Entrega selecionada ──► exibe Endereço + Confirmar Endereço
       │
       └── Retirada selecionada ──► oculta campos de endereço
       │
       ▼
Forma de pagamento, Obs., etc.
       │
       ▼
Mensagem WhatsApp inclui o tipo
       │
       ▼
Nota impressa exibe ENTREGA ou RETIRADA no lugar de MESA
```

## Como ficará o comprovante

Para Entrega:
```text
  ENTREGA       19/02 — 14:32
```

Para Retirada:
```text
  RETIRADA      19/02 — 14:32
```

## Arquivos afetados

| Arquivo | O que muda |
|---|---|
| `src/pages/UnitPage.tsx` | Adiciona estado `orderType` (Entrega/Retirada), selector de botões, lógica de exibição condicional dos campos de endereço, inclui TIPO nas notas estruturadas e na mensagem WhatsApp |
| `src/lib/printOrder.ts` | Lê o campo `TIPO` das notas para exibir "RETIRADA" ou "ENTREGA" no cabeçalho do comprovante |

## Detalhes técnicos

### Novo estado e validação em `UnitPage.tsx`
```typescript
const [orderType, setOrderType] = useState<"Entrega" | "Retirada" | "">("");
const [orderTypeError, setOrderTypeError] = useState(false);

// Validação: orderType é obrigatório
if (!orderType) { setOrderTypeError(true); valid = false; }

// Endereço só é validado quando for Entrega
if (orderType === "Entrega" && address.trim() && address.trim() !== addressConfirm.trim()) {
  setAddressError(true); valid = false;
}
```

### Campo adicionado nas notas estruturadas
```text
TIPO:Entrega|CLIENTE:João|TEL:...|END.:...|PGTO:PIX|DOC:...|OBS:...
TIPO:Retirada|CLIENTE:Maria|TEL:...|PGTO:Dinheiro
```

### Leitura em `printOrder.ts`
```typescript
// Já existe parseNotes() — basta adicionar o campo TIPO ao retorno
const tipo = parts["TIPO"]; // "Entrega" ou "Retirada"

// locationLabel já existente:
const locationLabel = order.table_number === 0
  ? (parsed?.tipo === "Retirada" ? "RETIRADA" : "ENTREGA")
  : `MESA ${order.table_number}`;
```

### UI do seletor de tipo

Dois botões grandes lado a lado (estilo card), com destaque visual na opção selecionada usando a cor primária da loja — sem dropdown, para facilitar o toque em celular.
