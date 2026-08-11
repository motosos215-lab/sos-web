import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, mergeAuthenticatedUserWithSetupState, syncRiderOnboardingSession } from "../../services/authService";
import { clearAuthTokens, getAuthTokens } from "../../services/authTokenService";
import { ensureFreshAccessToken, setUnauthorizedHandler } from "../../services/api";
import { clearSession, getActiveUserId } from "../../services/sessionService";
import { mapApiRoleToAppRole } from "../../utils/authRole";
import "./AuthInitializationGate.css";

interface AuthInitializationGateProps {
  children: ReactNode;
}

export function AuthInitializationGate({ children }: AuthInitializationGateProps) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "ready" | "error">("checking");
  const [isSlow, setIsSlow] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      navigate("/login", { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    const userId = getActiveUserId();

    if (!userId) {
      setStatus("ready");
      return;
    }

    const activeUserId = userId;

    let active = true;
    setStatus("checking");
    setIsSlow(false);

    const slowTimer = window.setTimeout(() => {
      if (active) {
        setIsSlow(true);
      }
    }, 15000);

    const tokens = getAuthTokens(activeUserId);

    if (!tokens) {
      clearSession();
      window.clearTimeout(slowTimer);
      setStatus("ready");
      return () => {
        active = false;
        window.clearTimeout(slowTimer);
      };
    }

    async function restoreSession() {
      try {
        await ensureFreshAccessToken();
        const user = await getCurrentUser();

        if (!active) {
          return;
        }

        if (user.id !== activeUserId) {
          clearAuthTokens(activeUserId);
          clearSession();
          navigate("/login", { replace: true });
          return;
        }

        const roleResult = mapApiRoleToAppRole(user.role);

        if (!roleResult.ok) {
          clearAuthTokens(activeUserId);
          clearSession();
          navigate("/login", { replace: true });
          return;
        }

        const session = mergeAuthenticatedUserWithSetupState(user, roleResult.role);
        await syncRiderOnboardingSession(session);

        setStatus("ready");
      } catch {
        if (active) {
          clearAuthTokens(activeUserId);
          clearSession();
          navigate("/login", { replace: true });
          setStatus("ready");
        }
      } finally {
        if (active) {
          window.clearTimeout(slowTimer);
        }
      }
    }

    restoreSession().catch(() => {
      if (active) {
        setStatus("error");
      }
    });

    return () => {
      active = false;
      window.clearTimeout(slowTimer);
    };
  }, [navigate, retryKey]);

  if (status === "checking") {
    return (
      <section className="auth-gate" aria-live="polite">
        <span className="auth-gate__logo" aria-hidden="true">
          MS
        </span>
        <p>Restaurando sesión...</p>
        <small>Estamos validando tu acceso de forma segura.</small>
        {isSlow ? (
          <>
            <small>La validación está tardando más de lo esperado.</small>
            <button onClick={() => navigate("/login", { replace: true })} type="button">
              Ir al inicio de sesión
            </button>
          </>
        ) : null}
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="auth-gate" aria-live="polite">
        <span className="auth-gate__logo" aria-hidden="true">
          MS
        </span>
        <p>No pudimos restaurar tu sesión</p>
        <button onClick={() => setRetryKey((current) => current + 1)} type="button">
          Reintentar
        </button>
        <button onClick={() => navigate("/login", { replace: true })} type="button">
          Ir al inicio de sesión
        </button>
      </section>
    );
  }

  return <>{children}</>;
}
