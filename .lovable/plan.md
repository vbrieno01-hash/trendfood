

# Remover acentos do cupom impresso

## Problema
Impressoras termicas nao suportam caracteres acentuados (a, e, c, o, etc.), causando distorcao no texto impresso. Exemplo: "Cartao de Credito" sai ilegivel.

## Solucao
Adicionar uma funcao `stripDiacritics` que converte caracteres acentuados para seus equivalentes sem acento, usando `String.normalize("NFD")` + regex. Aplicar essa funcao no texto final do cupom.

## Alteracoes

| Arquivo | O que muda |
|---------|-----------|
| `src/lib/formatReceiptText.ts` | Adicionar funcao `stripDiacritics` e aplicar no retorno de `formatReceiptText` (linha 163) |

### Detalhes tecnicos

Nova funcao:
```typescript
function stripDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
```

Linha 163 muda de:
```typescript
return lines.join("\n");
```
Para:
```typescript
return stripDiacritics(lines.join("\n"));
```

Isso cobre todos os textos do cupom: nomes de itens, forma de pagamento ("Cartao de Credito"), observacoes, endereco, nome do cliente, etc.

O modo navegador (`printOrder.ts`) nao precisa dessa mudanca porque o HTML renderiza acentos normalmente no browser.

1 arquivo, 2 linhas de codigo.
