import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertMessage } from "../../../components/common/AlertMessage/AlertMessage";
import { AuthTabs } from "../../../components/common/AuthTabs/AuthTabs";
import { Button } from "../../../components/common/Button/Button";
import { Checkbox } from "../../../components/common/Checkbox/Checkbox";
import { Input } from "../../../components/common/Input/Input";
import { PasswordInput } from "../../../components/common/PasswordInput/PasswordInput";
import { AuthLayout } from "../../../layouts/AuthLayout/AuthLayout";
import { login, requestAccessCode } from "../../../services/authService";
import { resolveOnboardingRoute } from "../../../services/onboardingService";
import { getApiErrorMessage } from "../../../utils/apiErrors";
import "./Login.css";

interface LoginFormValues {
  email: string;
  password: string;
  remember: boolean;
}

interface LoginFormErrors {
  email?: string;
  password?: string;
  form?: string;
}

interface LoginLocationState {
  message?: string;
}

const initialValues: LoginFormValues = {
  email: "",
  password: "",
  remember: false,
};

function validateLogin(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!values.email.trim()) {
    errors.email = "El correo electrónico es obligatorio.";
  } else if (!emailPattern.test(values.email.trim())) {
    errors.email = "Ingresa un correo electrónico válido.";
  }

  if (!values.password) {
    errors.password = "La contraseña es obligatoria.";
  } else if (values.password.length < 8) {
    errors.password = "La contraseña debe tener al menos 8 caracteres.";
  }

  return errors;
}

export function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LoginLocationState | null;
  const [values, setValues] = useState<LoginFormValues>(initialValues);
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [successMessage, setSuccessMessage] = useState(typeof state?.message === "string" ? state.message : "");

  useEffect(() => {
    if (typeof state?.message === "string") {
      setSuccessMessage(state.message);
    }
  }, [state?.message]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage("");

    const nextErrors = validateLogin(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const session = await login({
        email: values.email.trim().toLowerCase(),
        password: values.password,
        rememberMe: values.remember,
      });

      setSuccessMessage("Inicio de sesión correcto");

      if (session.role === "conductor" && !session.setupCompleted) {
        navigate(resolveOnboardingRoute(session.onboardingStatusSnapshot ?? {}, session));
        return;
      }

      navigate("/dashboard/resumen");
    } catch (error) {
      setErrors({ form: getApiErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccessCode = async () => {
    if (isRequestingCode) {
      return;
    }

    const email = values.email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      setErrors({ email: "Ingresa tu correo para enviarte el código de acceso." });
      return;
    }

    setErrors({});
    setIsRequestingCode(true);

    try {
      await requestAccessCode(email);
      navigate("/verificar-cuenta", { state: { email } });
    } catch (error) {
      setErrors({ form: getApiErrorMessage(error) });
    } finally {
      setIsRequestingCode(false);
    }
  };

  return (
    <AuthLayout>
      <section className="login-card" aria-labelledby="login-title">
        <AuthTabs />

        <div className="login-card__heading">
          <p>Bienvenido de vuelta</p>
          <h2 id="login-title">Accede a MotoSOS</h2>
        </div>

        <form className="login-form" noValidate onSubmit={handleSubmit}>
          {errors.form ? <AlertMessage variant="error">{errors.form}</AlertMessage> : null}

          <Input
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect="off"
            error={errors.email}
            id="email"
            inputMode="email"
            label="Correo electrónico"
            name="email"
            onChange={(event) => {
              setValues((current) => ({ ...current, email: event.target.value }));
              if (errors.email) {
                setErrors((current) => ({ ...current, email: undefined }));
              }
            }}
            placeholder="tu@email.com"
            spellCheck={false}
            type="email"
            value={values.email}
          />

          <PasswordInput
            autoCapitalize="none"
            autoComplete="current-password"
            autoCorrect="off"
            error={errors.password}
            id="password"
            label="Contraseña"
            name="password"
            onChange={(event) => {
              setValues((current) => ({ ...current, password: event.target.value }));
              if (errors.password) {
                setErrors((current) => ({ ...current, password: undefined }));
              }
            }}
            placeholder="Mínimo 8 caracteres"
            spellCheck={false}
            value={values.password}
          />

          <div className="login-form__options">
            <Checkbox
              checked={values.remember}
              id="remember"
              label="Recordarme"
              name="remember"
              onChange={(event) => setValues((current) => ({ ...current, remember: event.target.checked }))}
            />
            <Link className="login-form__link" to="/recuperar-contrasena">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <Button disabled={isRequestingCode} isLoading={isSubmitting} loadingText="Iniciando sesión..." type="submit">
            Iniciar sesión
          </Button>

          {successMessage ? <AlertMessage variant="success">{successMessage}</AlertMessage> : null}
        </form>

        <div className="login-card__divider">
          <span>o</span>
        </div>

        <Button
          disabled={isSubmitting}
          isLoading={isRequestingCode}
          loadingText="Enviando código..."
          onClick={handleAccessCode}
          variant="secondary"
        >
          Continuar con código de acceso
        </Button>

        <p className="login-card__note">Si eres conductor, monitor o administrador, accede con tu cuenta MotoSOS.</p>

        <p className="login-card__footer">
          ¿No tienes cuenta? <Link to="/registro">Crear cuenta</Link>
        </p>
      </section>
    </AuthLayout>
  );
}
