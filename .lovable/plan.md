
# Adicionar estrelas no rodape do cupom

Colocar asteriscos (`*`) em volta do nome da loja no rodape, sem usar caracteres especiais como `★`.

## Alteracoes

| Arquivo | Linha | De | Para |
|---------|-------|----|------|
| `src/lib/formatReceiptText.ts` | 161 | `storeName.toUpperCase()` | `"* " + storeName.toUpperCase() + " *"` |
| `src/lib/printOrder.ts` | 289 | `${storeName.toUpperCase()}` | `* ${storeName.toUpperCase()} *` |

Resultado no cupom:
```
* TRENDFOOD *
```

2 linhas, 2 arquivos.
