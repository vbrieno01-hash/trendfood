import React from "react";
import { logClientError, isIgnorableError } from "@/lib/errorLogger";
import { RouteFallback } from "@/App";

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

    if (isIgnorableError(error.message)) {
      console.info("[ErrorBoundary] Erro ambiental ignorado:", error.message);
      this.setState({ hasError: false });
      return;
    }

    // Chunk velho (após deploy): limpa cache + reload automático (até 2x).
    const msg = error.message || "";
    const isChunkError =
      msg.includes("Failed to fetch dynamically imported module") ||
      msg.includes("Importing a module script failed") ||
      msg.includes("error loading dynamically imported module") ||
      msg.includes("Loading chunk") ||
      msg.includes("Loading CSS chunk");
    if (isChunkError) {
      try {
        const KEY = "chunk_reload_count";
        const count = Number(sessionStorage.getItem(KEY) || "0");
        if (count < 2) {
          sessionStorage.setItem(KEY, String(count + 1));
          console.info("[ErrorBoundary] chunk velho, recuperando…");
          this.handleClearAndReload();
          return;
        }
      } catch {}
    }

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
      return <RouteFallback forceShow />;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
