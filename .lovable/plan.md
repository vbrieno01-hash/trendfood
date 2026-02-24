

## Remover referências ao Instagram do footer

### O que muda

**Arquivo: `src/pages/Index.tsx`**

1. **Remover o ícone do Instagram na seção Brand** (linhas 385-387) — o link com o ícone `<Instagram>` ao lado do WhatsApp
2. **Remover o link do Instagram na seção Contato** (linhas 428-433) — o item `@trendfood.app` com ícone
3. **Remover o import do `Instagram`** da lista de imports do lucide-react (linha 20), já que não será mais usado

### Resultado
O footer fica apenas com WhatsApp e email como canais de contato, sem nenhuma referência ao Instagram.

