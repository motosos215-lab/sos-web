import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertMessage } from "../../../components/common/AlertMessage/AlertMessage";
import { Button } from "../../../components/common/Button/Button";
import { OtpInput } from "../../../components/common/OtpInput/OtpInput";
import { PasswordInput } from "../../../components/common/PasswordInput/PasswordInput";
import { PasswordRequirements } from "../../../components/common/PasswordRequirements/PasswordRequirements";
import { AuthLayout } from "../../../layouts/AuthLayout/AuthLayout";
import { resetPassword } from "../../../services/authService";
import { getApiErrorMessage } from "../../../utils/apiErrors";
import "./ResetPassword.css";

interface ResetPasswordLocationState {
  email?: string;
}

interface ResetPasswordFormData {
  code: string;
  newPassword: string;
  confirmPassword: string;
}

interface ResetPasswordErrors {
  code?: string;
  newPassword?: string;
  confirmPassword?: string;
  form?: string;
}

function hasStrongPassword(password: string) {
  return password.trim().length > 0 && password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
}

function validateResetPassword(data: ResetPasswordFormData): ResetPasswordErrors {
  const errors: ResetPasswordErrors = {};

  if (!/^\d{6}$/.test(data.code)) {
    errors.code = "Ingresa el código de seis dígitos";
  }

  if (!data.newPassword.trim()) {
    errors.newPassword = "La contraseña es obligatoria.";
  } else if (!hasStrongPassword(data.newPassword)) {
    errors.newPassword = "La contraseña no cumple los requisitos mínimos.";
  }

  if (!data.confirmPassword) {
    errors.confirmPassword = "Confirma tu contraseña.";
  } else if (data.confirmPassword !== data.newPassword) {
    errors.confirmPassword = "Las contraseñas no coinciden";
  }

  return errors;
}

function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) {
    return email;
  }

  const visible = localPart.slice(0, Math.min(4, localPart.length));
  return `${visible}${"*".repeat(Math.max(4, localPart.length - visible.length))}@${domain}`;
}

export function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ResetPasswordLocationState | null;
  const email = typeof state?.email === "string" ? state.email : "";
  const navigationTimeoutRef = useRef<number | null>(null);
  const [formData, setFormData] = useState<ResetPasswordFormData>({
    code: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<ResetPasswordErrors>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        window.clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  const updateField = <Field extends keyof ResetPasswordFormData>(field: Field, value: ResetPasswordFormData[Field]) => {
    setFormData((current) => ({ ...current, [field]: value }));

    if (errors[field] || errors.form) {
      setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setSuccessMessage("");

    const nextErrors = validateResetPassword(formData);

    if (!email) {
      nextErrors.form = "Solicita primero un código de recuperación para continuar.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword(email, formData.code, formData.newPassword);
      setSuccessMessage("Contraseña actualizada correctamente. Ya puedes iniciar sesión.");
      navigationTimeoutRef.current = window.setTimeout(() => navigate("/login"), 900);
    } catch (error) {
      setErrors({ form: getApiErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <section className="reset-card" aria-labelledby="reset-password-title">
        <div className="reset-card__heading">
          <p>Protege tu acceso</p>
          <h1 id="reset-password-title">Crear nueva contraseña</h1>
        </div>

        <p className="reset-card__description">Ingresa el código recibido y establece una nueva contraseña</p>

        {email ? (
          <strong className="reset-card__email">Código enviado a {maskEmail(email)}</strong>
        ) : (
          <AlertMessage variant="info">
            No encontramos un correo asociado. Solicita un código de recuperación antes de continuar.
          </AlertMessage>
        )}

        <form className="reset-form" noValidate onSubmit={handleSubmit}>
          {errors.form ? <AlertMessage variant="error">{errors.form}</AlertMessage> : null}
          {successMessage ? <AlertMessage variant="success">{successMessage}</AlertMessage> : null}

          <OtpInput
            error={errors.code}
            id="passwordResetCode"
            label="Código enviado"
            onChange={(value) => updateField("code", value)}
            value={formData.code}
          />

          <div>
            <PasswordInput
              aria-describedby="new-password-requirements"
              autoComplete="new-password"
              error={errors.newPassword}
              id="newPassword"
              label="Nueva contraseña"
              name="newPassword"
              onChange={(event) => updateField("newPassword", event.target.value)}
              placeholder="Ej. MotoSOS2026"
              value={formData.newPassword}
            />
            <PasswordRequirements id="new-password-requirements" password={formData.newPassword} />
          </div>

          <PasswordInput
            autoComplete="new-password"
            error={errors.confirmPassword}
            id="confirmNewPassword"
            label="Confirmar nueva contraseña"
            name="confirmNewPassword"
            onChange={(event) => updateField("confirmPassword", event.target.value)}
            placeholder="Ej. MotoSOS2026"
            value={formData.confirmPassword}
          />

          <Button disabled={isSubmitting} isLoading={isSubmitting} loadingText="Cambiando contraseña..." type="submit">
            Cambiar contraseña
          </Button>
        </form>

        <div className="reset-card__links">
          <Link to="/login">Iniciar sesión</Link>
          <Link to="/register">Crear cuenta</Link>
        </div>
      </section>
    </AuthLayout>
  );
}
