
# Comprovante completo com todos os dados do cliente + CPF/CNPJ

## Visão geral

Com base na imagem de referência, o comprovante precisa exibir estruturadamente: nome do cliente, telefone, endereço, forma de pagamento e CPF/CNPJ. Atualmente esses dados são concatenados em um único campo `notes` como texto livre, então o comprovante não consegue separá-los visualmente.

A solução envolve dois grupos de mudanças:

1. **Checkout (`UnitPage`)** — adicionar campo de CPF/CNPJ e telefone, e estruturar o `notes` de forma que o comprovante possa interpretar os dados.
2. **Comprovante (`printOrder.ts`)** — redesenhar o layout para exibir cada campo em sua própria linha, com formatação similar à imagem de referência.

---

## Como ficará o comprovante

```text
┌──────────────────────────────┐
│        BURGUER DO REI        │
│  ────────────────────────────│
│  ENTREGA         19/02 14:32 │
│  ────────────────────────────│
│  2x  X-Burguer       R$29,80 │
│  1x  Batata Frita    R$12,00 │
│  1x  Coca-Cola        R$8,00 │
│  ────────────────────────────│
│  TOTAL: R$ 49,80             │
│  ────────────────────────────│
│  [████ QR CODE PIX ████]     │
│   Pague com Pix              │
│  ────────────────────────────│
│  Nome:    João Silva         │
│  Tel:     (11) 99999-1234    │
│  End.:    Rua das Flores, 10 │
│  Pgto:    PIX                │
│  CPF/CNPJ: 123.456.789-00   │
│  ────────────────────────────│
│  ★ novo pedido — kds ★       │
└──────────────────────────────┘
```

---

## Arquivos afetados

| Arquivo | O que muda |
|---|---|
| `src/pages/UnitPage.tsx` | Adiciona campos de telefone e CPF/CNPJ no checkout; estrutura o `notes` com prefixos legíveis |
| `src/lib/printOrder.ts` | Parser do campo `notes` para extrair dados do cliente e renderizar cada linha separadamente no HTML |

Sem alteração de banco — o campo `notes` (texto, já existente) continua sendo usado para armazenar as informações do cliente. O formato será um pouco mais estruturado com separadores claros.

---

## Detalhes técnicos

### Formato do campo `notes` (após a mudança)

Os dados do cliente serão salvos no campo `notes` com um separador especial para que o comprovante possa interpretá-los:

```
CLIENTE:João Silva|TEL:(11) 99999-1234|END.:Rua das Flores, 10|PGTO:PIX|DOC:123.456.789-00|OBS:sem cebola
```

Esse formato usa `|` como separador e `CHAVE:valor` para cada campo. O `printOrder.ts` faz o parse desse string e renderiza cada campo em sua própria linha no comprovante.

### Novos campos no checkout (`UnitPage`)

- **Telefone** (opcional) — `inputMode="tel"`, máximo 20 caracteres
- **CPF/CNPJ** (opcional) — campo de texto simples, sem validação rígida, aceita qualquer formato

Ambos são opcionais para não travar o fluxo do cliente.

### Parser no `printOrder.ts`

```typescript
function parseNotes(notes: string) {
  // Se contém o separador "|", é o novo formato estruturado
  if (!notes.includes("|")) return { raw: notes };
  
  const parts = Object.fromEntries(
    notes.split("|").map(part => {
      const idx = part.indexOf(":");
      return [part.slice(0, idx), part.slice(idx + 1)];
    })
  );
  return {
    name: parts["CLIENTE"],
    phone: parts["TEL"],
    address: parts["END."],
    payment: parts["PGTO"],
    doc: parts["DOC"],
    obs: parts["OBS"],
  };
}
```

### Layout HTML do bloco de dados do cliente

Os campos são renderizados em uma tabela de duas colunas (rótulo + valor) para manter o alinhamento correto na impressora térmica — igual ao estilo da imagem de referência.

Pedidos de mesa (sem dados de cliente) não são afetados: se o `notes` não tiver o separador `|`, é exibido como observação simples, exatamente como hoje.
