
## Simplificar tela de sucesso do pedido

### Mudança em `src/pages/TableOrderPage.tsx`
Nas 8 telas de sucesso (após envio do pedido):

1. **Remover** o botão laranja "Fazer outro pedido nesta mesa".
2. **Manter apenas** o botão "Voltar para Mesas & Comandas" / "Voltar para identificação da mesa", mas torná-lo **mais visível**:
   - Trocar de `variant="link"` discreto (text-muted-foreground/70, text-xs) para um botão **outline** com texto normal e tamanho padrão.
   - Cor de texto legível (foreground padrão), não esmaecida.

### Resultado
Tela de sucesso terá só uma ação clara e visível: voltar (para Mesas & Comandas se lojista, ou identificação da mesa se cliente).
