

## Correção: ErrorBoundary preso na tela "Algo deu errado"

### Problema

O ErrorBoundary que criamos captura erros de renderização, mas o botão "Tentar novamente" apenas faz `window.location.reload()`. Se o erro persistir (cache do service worker, dados do usuário, etc.), a página fica presa nessa tela sem sair.

### Causas possíveis

1. O ErrorBoundary nao tenta re-renderizar os componentes filhos -- vai direto pro reload
2. O service worker (PWA) pode estar servindo JavaScript antigo/quebrado mesmo apos reload
3. O Skeleton component gera warning de ref que, em combinacao com outros erros, pode crashar a arvore React
4. Nao ha log visivel do erro real para debug futuro

### Correcoes

#### 1. `src/components/ErrorBoundary.tsx` -- recuperacao inteligente

- Primeira tentativa: resetar `hasError` para `false` e tentar renderizar novamente (sem reload)
- Se crashar de novo em menos de 3 segundos: mostrar tela com opcao de "Limpar cache e recarregar"
- A opcao de limpar cache desregistra o service worker e limpa caches antes de recarregar
- Logar o erro real no console para debug

#### 2. `src/components/ui/skeleton.tsx` -- adicionar forwardRef

- Envolver o Skeleton com `React.forwardRef` para eliminar o warning de ref que aparece nos logs
- Isso evita que o warning se combine com outros problemas e cause crash

#### 3. `src/App.tsx` -- limpar service worker quebrado

- No listener de `unhandledrejection`, adicionar log mais detalhado
- Nenhuma outra mudanca necessaria no App

---

### Detalhes tecnicos

**ErrorBoundary.tsx -- versao com recuperacao:**
```typescript
class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, retryCount: 0 };
  lastErrorTime = 0;

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
    this.lastErrorTime = Date.now();
  }

  handleRetry = () => {
    // Se crashou ha menos de 3s, provavelmente vai crashar de novo
    // Oferece limpar cache
    if (Date.now() - this.lastErrorTime < 3000 && this.state.retryCount > 0) {
      this.handleClearAndReload();
      return;
    }
    // Tenta re-renderizar sem reload
    this.setState(prev => ({ hasError: false, retryCount: prev.retryCount + 1 }));
  };

  handleClearAndReload = async () => {
    // Desregistra service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    }
    // Limpa caches
    if ('caches' in window) {
      const names = await caches.keys();
      for (const name of names) {
        await caches.delete(name);
      }
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div> /* tela com "Tentar novamente" + "Limpar cache" */ </div>
      );
    }
    return this.props.children;
  }
}
```

**skeleton.tsx -- com forwardRef:**
```typescript
const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />
  )
);
Skeleton.displayName = "Skeleton";
```

### Resultado esperado

- O botao "Tentar novamente" primeiro tenta re-renderizar sem recarregar a pagina
- Se falhar de novo rapidamente, oferece "Limpar cache e recarregar" que remove service workers e caches
- O warning de ref do Skeleton e eliminado
- Erros reais sao logados no console para debug futuro
- O usuario nunca mais fica preso na tela de erro
