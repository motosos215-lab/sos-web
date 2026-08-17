import { Component, type ErrorInfo, type ReactNode } from "react";
import "./AppErrorBoundary.css";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  errorName: string;
  hasError: boolean;
  shouldReload: boolean;
}

function isChunkLoadError(error: Error): boolean {
  const text = `${error.name} ${error.message}`.toLowerCase();

  return text.includes("chunk") || text.includes("dynamic import") || text.includes("failed to fetch dynamically imported module");
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    errorName: "",
    hasError: false,
    shouldReload: false,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      errorName: error.name || "Error",
      hasError: true,
      shouldReload: isChunkLoadError(error),
    };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    // React keeps the app recoverable here. Sensitive data is intentionally not logged.
    if (!isChunkLoadError(error)) {
      return;
    }

    const reloadKey = `motosos.chunkReload.${window.location.pathname}`;

    if (window.sessionStorage.getItem(reloadKey)) {
      return;
    }

    window.sessionStorage.setItem(reloadKey, "1");
    window.location.reload();
  }

  private retry = () => {
    if (this.state.shouldReload) {
      window.location.reload();
      return;
    }

    this.setState({ errorName: "", hasError: false });
  };

  private goToLogin = () => {
    window.location.assign("/login");
  };

  private clearLocalAuth = () => {
    const currentUserId = window.sessionStorage.getItem("motosos.currentUserId");

    if (currentUserId) {
      window.sessionStorage.removeItem(`motosos.auth.${currentUserId}`);
    }

    window.sessionStorage.removeItem("motosos.currentUserId");
    this.goToLogin();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="app-error" aria-live="assertive">
        <section className="app-error__card">
          <div className="app-error__logo" aria-hidden="true">
            MS
          </div>
          <h1>MotoSOS no pudo cargar esta pantalla</h1>
          <p>Ocurrió un error inesperado al iniciar la aplicación.</p>
          {import.meta.env.DEV && this.state.errorName ? <small>Error detectado: {this.state.errorName}</small> : null}
          <div className="app-error__actions">
            <button onClick={this.retry} type="button">
              {this.state.shouldReload ? "Actualizar aplicación" : "Reintentar"}
            </button>
            <button onClick={this.goToLogin} type="button">
              Ir al inicio de sesión
            </button>
            {import.meta.env.DEV ? (
              <button onClick={this.clearLocalAuth} type="button">
                Limpiar autenticación local
              </button>
            ) : null}
          </div>
        </section>
      </main>
    );
  }
}
