import React from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { logClientError } from "@/lib/errorLogger";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  retryCount: number;
  errorMessage: string;
  errorStack: string;
}

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, retryCount: 0, errorMessage: "", errorStack: "" };
  lastErrorTime = 0;

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
    this.lastErrorTime = Date.now();
    this.setState({
      errorMessage: `${error.name}: ${error.message}`,
      errorStack: error.stack || "",
    });
    try {
      sessionStorage.setItem("app_crashed", "true");
    } catch (_) {}
    logClientError({
      message: `${error.name}: ${error.message}`,
      stack: error.stack,
      source: "error_boundary",
      metadata: { componentStack: info.componentStack },
    });
  }

  handleRetry = () => {
    if (Date.now() - this.lastErrorTime < 3000 && this.state.retryCount > 0) {
      this.handleClearAndReload();
      return;
    }
    this.setState(prev => ({ hasError: false, retryCount: prev.retryCount + 1 }));
  };

  handleClearAndReload = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ('caches' in window) {
        const names = await caches.keys();
        for (const name of names) {
          await caches.delete(name);
        }
      }
    } catch (e) {
      console.error("[ErrorBoundary] Cache clear failed:", e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-6">
          <div className="text-center space-y-4 max-w-sm">
            <p className="text-4xl">😕</p>
            <h1 className="text-xl font-bold text-foreground">Algo deu errado</h1>
            <p className="text-sm text-muted-foreground">
              Ocorreu um erro inesperado. Tente novamente ou limpe o cache.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:opacity-90 transition"
              >
                Tentar novamente
              </button>
              <button
                onClick={this.handleClearAndReload}
                className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-6 py-3 text-sm font-medium text-foreground shadow-sm hover:bg-accent transition"
              >
                Limpar cache e recarregar
              </button>
            </div>
            {this.state.errorMessage && (
              <Collapsible>
                <CollapsibleTrigger className="text-xs text-muted-foreground underline cursor-pointer">
                  Ver detalhes do erro
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 text-left bg-muted rounded-lg p-3 max-h-40 overflow-auto">
                    <p className="text-xs font-mono text-destructive break-all">{this.state.errorMessage}</p>
                    {this.state.errorStack && (
                      <pre className="text-[10px] font-mono text-muted-foreground mt-2 whitespace-pre-wrap break-all">
                        {this.state.errorStack}
                      </pre>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
