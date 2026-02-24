

## Corrigir input perdendo foco no Chat de Vendas

### Problema
Os componentes `ConversationList` e `ChatArea` estao definidos como funcoes internas dentro do `SalesChatTab`. Isso faz com que a cada digitacao (mudanca de state `input`), o React recrie esses componentes do zero, causando perda de foco no campo de texto.

### Solucao
Converter `ConversationList` e `ChatArea` de funcoes internas para JSX inline direto no return do componente. Assim o React consegue preservar o DOM entre re-renders e o input mantem o foco.

### Detalhes Tecnicos

**Arquivo**: `src/components/admin/SalesChatTab.tsx`

- Remover a declaracao `const ConversationList = () => (...)` (linhas 311-386)
- Remover a declaracao `const ChatArea = () => (...)` (linhas 389-517)
- No JSX final (linhas 519-532), substituir `<ConversationList />` e `<ChatArea />` pelo JSX que estava dentro dessas funcoes, colando diretamente inline
- Nenhuma logica muda, apenas a estrutura de onde o JSX fica

### Resultado
O campo "Cole o que o cliente falou..." vai funcionar normalmente, sem perder foco a cada letra digitada.

