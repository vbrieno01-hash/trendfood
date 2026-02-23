

## Correção: Clientes presos na tela "Algo deu errado"

### Problema

Clientes ficam presos na tela de erro mesmo depois de limpar cookies e dados do navegador. Isso acontece porque:

1. O Service Worker (PWA) continua servindo arquivos JavaScript antigos/quebrados mesmo apos limpar cookies -- cookies e cache do SW sao coisas diferentes
2. O ErrorBoundary nao mostra qual e o erro real, impossibilitando debug
3. Nao ha mecanismo automatico para detectar e corrigir cache corrompido

### Solucao (3 mudancas)

#### 1. ErrorBoundary com informacoes do erro real

Atualizar `src/components/ErrorBoundary.tsx` para:
- Mostrar o nome e mensagem do erro real na tela (em texto pequeno, colapsavel)
- Isso permite que voce identifique o problema quando clientes mandarem prints
- Manter os botoes "Tentar novamente" e "Limpar cache e recarregar"

#### 2. Limpeza automatica de Service Worker no carregamento

Adicionar em `src/App.tsx` um useEffect que roda uma unica vez no mount:
- Verifica se o Service Worker esta servindo conteudo desatualizado
- Se detectar que a app crashou recentemente (flag no sessionStorage), desregistra o SW automaticamente e recarrega
- Isso resolve o caso de clientes que limpam cookies mas o SW continua ativo

```typescript
// Em AppInner, novo useEffect:
useEffect(() => {
  const crashed = sessionStorage.getItem("app_crashed");
  if (crashed) {
    sessionStorage.removeItem("app_crashed");
    // Limpar SW e caches automaticamente
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister());
      });
    }
    if ('caches' in window) {
      caches.keys().then(names => names.forEach(n => caches.delete(n)));
    }
  }
}, []);
```

#### 3. ErrorBoundary marca crash no sessionStorage

Quando o ErrorBoundary captura um erro, salva uma flag no sessionStorage:
```typescript
componentDidCatch(error, info) {
  sessionStorage.setItem("app_crashed", "true");
  // ... log existente
}
```

Na proxima vez que a pagina carregar, o useEffect do App detecta a flag e limpa o SW automaticamente. Assim, mesmo que o usuario apenas recarregue a pagina (F5), o cache corrompido e removido.

### Detalhes tecnicos

**ErrorBoundary.tsx:**
- Adicionar state `errorMessage` para guardar a mensagem do erro
- No `componentDidCatch`, salvar `error.message` e `error.stack` 
- No render da tela de erro, mostrar a mensagem em um bloco colapsavel com fonte pequena
- No `componentDidCatch`, setar `sessionStorage.setItem("app_crashed", "true")`

**App.tsx:**
- No `AppInner`, adicionar useEffect que verifica `sessionStorage.getItem("app_crashed")`
- Se existir, remove a flag e desregistra todos os Service Workers + limpa caches
- Isso garante que na proxima recarga a app baixa tudo fresco do servidor

### Resultado esperado

- Clientes que cairem na tela de erro verao a mensagem real do problema
- Na proxima recarga apos um crash, o Service Worker e limpo automaticamente
- Nao sera mais necessario que o cliente saiba limpar cache manualmente
- Voce podera diagnosticar problemas pelos prints que clientes enviarem (a mensagem de erro aparece na tela)

