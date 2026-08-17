import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertMessage } from "../../../components/common/AlertMessage/AlertMessage";
import { AuthTabs } from "../../../components/common/AuthTabs/AuthTabs";
import { Button } from "../../../components/common/Button/Button";
import { OtpInput } from "../../../components/common/OtpInput/OtpInput";
import { AuthLayout } from "../../../layouts/AuthLayout/AuthLayout";
import { loginWithCode, requestAccessCode } from "../../../services/authService";
import { getApiErrorMessage } from "../../../utils/apiErrors";
import "./VerifyAccount.css";

interface VerifyAccountLocationState {
  email?: string;
}

interface PageMessage {
  text: string;
  variant: "success" | "error" | "info" | "warning";
}

const OTP_LENGTH = 6;
const INITIAL_SECONDS = 60;

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) {
    return email;
  }

  const visible = localPart.slice(0, Math.min(4, localPart.length));
  return `${visible}${"*".repeat(Math.max(4, localPart.length - visible.length))}@${domain}`;
}

export function VerifyAccount() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as VerifyAccountLocationState | null;
  const email = typeof state?.email === "string" ? state.email : "";
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [message, setMessage] = useState<PageMessage | null>(
    email
      ? null
      : {
          text: "No encontramos un correo asociado a esta verificación. Puedes volver al registro o iniciar sesión.",
          variant: "info",
        },
  );
  const [secondsLeft, setSecondsLeft] = useState(INITIAL_SECONDS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const navigationTimeoutRef = useRef<number | null>(null);

  const isExpired = secondsLeft === 0;

  useEffect(() => {
    if (!email || secondsLeft === 0) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [email, secondsLeft]);

  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        window.clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  const updateCode = (nextCode: string) => {
    setCode(nextCode);

    if (codeError) {
      setCodeError("");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || isSubmitting || isExpired) {
      return;
    }

    setMessage(null);

    if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code)) {
      setCodeError("Ingresa el código de seis dígitos");
      return;
    }

    setIsSubmitting(true);

    try {
      await loginWithCode({ email, code });
      setMessage({ text: "Cuenta verificada correctamente", variant: "success" });
      navigationTimeoutRef.current = window.setTimeout(() => navigate("/"), 700);
    } catch (error) {
      setMessage({ text: getApiErrorMessage(error), variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email || isResending || !isExpired) {
      return;
    }

    setIsResending(true);
    setMessage(null);

    try {
      await requestAccessCode(email);
      setSecondsLeft(INITIAL_SECONDS);
      setMessage({ text: "Te enviamos un nuevo código de acceso", variant: "success" });
    } catch (error) {
      setMessage({ text: getApiErrorMessage(error), variant: "error" });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout>
      <section className="verify-card" aria-labelledby="verify-account-title">
        <AuthTabs />

        <div className="verify-card__heading">
          <p>Registro recibido</p>
          <h1 id="verify-account-title">Verifica tu cuenta</h1>
        </div>

        <p className="verify-card__description">Ingresa el código de verificación que enviamos a tu correo</p>

        {email ? <strong className="verify-card__email">{maskEmail(email)}</strong> : null}

        {message ? <AlertMessage variant={message.variant}>{message.text}</AlertMessage> : null}

        {email ? (
          <form className="verify-form" noValidate onSubmit={handleSubmit}>
            <OtpInput error={codeError} id="verifyCode" label="Código de verificación" onChange={updateCode} value={code} />

            <p className="verify-form__timer" aria-live="polite">
              {isExpired ? "El código ha expirado" : `El código expira en ${formatTime(secondsLeft)}`}
            </p>

            <Button disabled={isSubmitting || isExpired} isLoading={isSubmitting} loadingText="Verificando..." type="submit">
              Verificar cuenta
            </Button>
          </form>
        ) : null}

        <div className="verify-card__resend">
          <p>¿No recibiste el código?</p>
          <Button
            disabled={!email || !isExpired || isResending}
            isLoading={isResending}
            loadingText="Reenviando..."
            onClick={handleResend}
            type="button"
            variant="secondary"
          >
            Reenviar código
          </Button>
        </div>

        <div className="verify-card__links">
          {!email ? <Link to="/registro">Volver al registro</Link> : null}
          <Link to="/login">Volver al inicio de sesión</Link>
        </div>
      </section>
    </AuthLayout>
  );
}
