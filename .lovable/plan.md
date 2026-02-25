

# Plano: Campo "Troco para" no checkout com pagamento em Dinheiro

## Problema
Quando o cliente escolhe pagar com **Dinheiro** na entrega, o motoboy não sabe quanto de troco levar. O cliente precisa informar com qual nota vai pagar para que o troco já esteja separado na saída.

## O que será feito

### 1. Adicionar campo "Troco para" no checkout (`src/pages/UnitPage.tsx`)

**Estado novo** (junto aos outros estados do checkout, ~linha 170):
- `changeFor`: número representando o valor da nota que o cliente vai pagar (ex: R$ 50, R$ 100)
- `changeForError`: booleano para validação

**UI condicional** (após o Select de pagamento, ~linha 1118):
- Quando `payment === "Dinheiro"`, exibir:
  - Texto: "Precisa de troco?"
  - Botões rápidos com valores comuns: R$ 20, R$ 50, R$ 100, R$ 200
  - Opção "Não precisa" (valor 0)
  - Campo manual para valor personalizado (usando CurrencyInput)
  - Se `changeFor > 0`: mostrar o cálculo do troco automaticamente: **"Troco: R$ X,XX"**
  - Validação: se `changeFor > 0` e `changeFor < grandTotal`, mostrar erro "O valor deve ser maior que o total"

### 2. Incluir "TROCO" nas notes do pedido

**Nas noteParts** (~linhas 306 e 392):
- Adicionar `TROCO:R$ XX,XX` quando `changeFor > 0`
- Ex: `TROCO:R$ 50,00`

### 3. Incluir no WhatsApp

**Na mensagem WhatsApp** (~linhas 354 e 456):
- Após a linha de pagamento, adicionar:
  - `💵 *Troco para:* R$ 50,00`
  - `🔄 *Troco:* R$ 15,00`

### 4. Exibir troco no KDS/impressão (parse do notes)

**Em `src/lib/formatReceiptText.ts`**:
- Verificar se já faz parse de `TROCO:` — se não, adicionar para que apareça no comprovante impresso

## Seção técnica

```text
Arquivo principal: src/pages/UnitPage.tsx
  - ~linha 170: novo estado changeFor (number), changeForError (boolean)
  - ~linha 1118: UI condicional com botões rápidos + CurrencyInput
  - ~linhas 306, 392: adicionar TROCO nas noteParts
  - ~linhas 354, 456: adicionar troco na mensagem WhatsApp

Arquivo secundário: src/lib/formatReceiptText.ts
  - parse do campo TROCO: para exibição em comprovante

Componente reutilizado: src/components/ui/currency-input.tsx
```

