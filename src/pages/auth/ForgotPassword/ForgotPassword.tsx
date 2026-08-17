import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertMessage } from "../../../components/common/AlertMessage/AlertMessage";
import { Button } from "../../../components/common/Button/Button";
import { Input } from "../../../components/common/Input/Input";
import { AuthLayout } from "../../../layouts/AuthLayout/AuthLayout";
import { forgotPassword } from "../../../services/authService";
import { getApiErrorMessage } from "../../../utils/apiErrors";
import "./ForgotPassword.css";

interface ForgotPasswordErrors {
  email?: string;
  form?: string;
}

function validateEmail(email: string) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email.trim()) {
    return "El correo electrónico es obligatorio.";
  }

  if (!emailPattern.test(email.trim())) {
    return "Ingresa un correo electrónico válido.";
  }

  return "";
}

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<ForgotPasswordErrors>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setSuccessMessage("");
    const emailError = validateEmail(email);

    if (emailError) {
      setErrors({ email: emailError });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    setErrors({});
    setIsSubmitting(true);

    try {
      await forgotPassword(normalizedEmail);
      setSuccessMessage("Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña");
      window.setTimeout(() => navigate("/restablecer-contrasena", { state: { email: normalizedEmail } }), 700);
    } catch (error) {
      setErrors({ form: getApiErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <section className="forgot-card" aria-labelledby="forgot-password-title">
        <div className="forgot-card__heading">
          <p>Acceso seguro</p>
          <h1 id="forgot-password-title">Recuperar contraseña</h1>
        </div>

        <p className="forgot-card__description">Ingresa tu correo y te enviaremos un código para restablecer tu contraseña</p>

        <form className="forgot-form" noValidate onSubmit={handleSubmit}>
          {errors.form ? <AlertMessage variant="error">{errors.form}</AlertMessage> : null}
          {successMessage ? <AlertMessage variant="success">{successMessage}</AlertMessage> : null}

          <Input
            autoComplete="email"
            error={errors.email}
            id="resetEmail"
            label="Correo electrónico"
            name="email"
            onChange={(event) => {
              setEmail(event.target.value);
              if (errors.email || errors.form) {
                setErrors((current) => ({ ...current, email: undefined, form: undefined }));
              }
            }}
            placeholder="tu@email.com"
            type="email"
            value={email}
          />

          <Button disabled={isSubmitting} isLoading={isSubmitting} loadingText="Enviando código..." type="submit">
            Enviar código
          </Button>
        </form>

        <div className="forgot-card__links">
          <Link to="/login">Iniciar sesión</Link>
          <Link to="/registro">Crear cuenta</Link>
        </div>
      </section>
    </AuthLayout>
  );
}
