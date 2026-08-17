import { Component, type ErrorInfo, type ReactNode } from "react";
import "./AppErrorBoundary.css";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  errorName: string;
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    errorName: "",
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      errorName: error.name || "Error",
      hasError: true,
    };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // React keeps the app recoverable here. Sensitive data is intentionally not logged.
  }

  private retry = () => {
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
              Reintentar
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
