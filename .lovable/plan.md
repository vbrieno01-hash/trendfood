

## Adicionar botão "Voltar para o início" na tela de pedido enviado

### Arquivo
`src/pages/TableOrderPage.tsx` — tela de confirmação após envio do pedido na mesa.

### Mudança
Logo abaixo do link "Fazer outro pedido nesta mesa", adicionar um segundo link/botão:

- **Texto**: "Voltar para o início"
- **Ação**: navegar para `/unidade/{slug}` (cardápio principal da loja, sem mesa)
- **Estilo**: visual secundário (text-muted-foreground, menor que o link principal) para hierarquia clara

### Resultado
O cliente terá duas opções claras na tela de sucesso:
1. Fazer outro pedido nesta mesa (primário)
2. Voltar para o início (secundário) — sai do contexto de mesa

