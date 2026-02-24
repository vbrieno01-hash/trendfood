

## Plano: Preencher mais a tela no desktop (menos espaço em branco)

### Problema
A página pública da loja (UnitPage) usa `max-w-2xl` (672px) em todos os containers, deixando muito espaço em branco nas laterais em telas desktop.

### Alterações propostas

**Arquivo: `src/pages/UnitPage.tsx`**

1. **Ampliar todos os containers `max-w-2xl`** para `max-w-2xl lg:max-w-5xl` (~1024px no desktop):
   - Header (linha 526)
   - Banner da loja (linha 545)
   - Barra de busca (linha 558)
   - Main content (linha 582)
   - Loading skeleton (linha 176)

2. **Aumentar colunas do grid de produtos no desktop**:
   - Linha 682: de `grid-cols-3` para `grid-cols-3 lg:grid-cols-5` — mais produtos por linha no desktop, mantendo 3 colunas no mobile.

### Resultado
- **Mobile/tablet**: nenhuma mudança visual
- **Desktop**: conteúdo ocupa ~1024px ao invés de 672px, grid mostra 5 produtos por linha, eliminando o excesso de espaço branco

