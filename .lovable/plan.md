

## Plano: Upload da foto somente ao salvar (elimina async durante seleção)

### Diagnóstico

O problema persiste porque `doImmediateUpload` dispara uma requisição de rede (upload ao Storage) no exato momento em que o Android está resumindo o WebView após a galeria. Esse timing causa remount/perda de estado que nem `sessionStorage` consegue cobrir de forma 100% confiável. A solução definitiva: **zero operações assíncronas durante a seleção de foto**.

### Mudanças

**Arquivo: `src/components/dashboard/MenuTab.tsx`**

1. **`handleImageChange`** passa a ser síncrono:
   - Apenas guarda o `File` no form (`form.imageFile = file`)
   - Cria preview local via `URL.createObjectURL(file)` (sem rede)
   - Nenhum upload, nenhum toast, nenhuma Promise

2. **Remover `doImmediateUpload`** completamente

3. **`handleSubmit`** passa a fazer o upload antes de salvar:
   ```text
   handleSubmit:
     1. Se form.imageFile existir → uploadMenuImage() → seta form.image_url
     2. Depois: addMutation / updateMutation como hoje
     3. closeModal()
   ```

4. **Simplificar persistência de draft**: remover a lógica de salvar `image_url` intermediário no draft (não há mais URL intermediária). O draft persiste o formulário textual; se houver remount, o usuário re-seleciona a foto (operação rápida).

5. **Limpar `URL.createObjectURL`** no `closeModal` para evitar memory leaks.

### Por que isso resolve

- **Zero async durante seleção de foto** = o Android pode pausar/resumir o WebView à vontade sem interferir em nenhum estado
- O `File` object fica em memória React; se o componente sobrevive (que é o esperado com modal puro), a foto está lá
- Se por acaso houver remount, o modal reabre via draft mas sem foto (usuário re-seleciona, é um clique)
- Upload só acontece no botão "Salvar", quando o app já está estável

### O que NÃO muda
- Estrutura do modal (continua div pura, sem Radix)
- `AlertDialog` de exclusão
- Lista de itens, filtros, ordenação
- Hook `useMenuItems`

### Detalhes técnicos

O fluxo atual dispara `uploadMenuImage()` → fetch HTTP → setState durante o callback de retorno da galeria Android. O Android WebView ainda está processando o retorno de foco da Activity da galeria nesse momento. A combinação de:
- Callback assíncrono completando durante transição de Activity
- React Query invalidation implícita
- Múltiplos `setState` em sequência rápida

...pode causar uma cascata de re-renders que, em alguns dispositivos Android, resulta em perda do estado do componente. Removendo toda operação assíncrona desse momento crítico, o problema é eliminado na origem.

