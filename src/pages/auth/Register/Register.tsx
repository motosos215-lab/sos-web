import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AccountTypeSelector, type AccountType } from "../../../components/common/AccountTypeSelector/AccountTypeSelector";
import { AlertMessage } from "../../../components/common/AlertMessage/AlertMessage";
import { AuthTabs } from "../../../components/common/AuthTabs/AuthTabs";
import { Button } from "../../../components/common/Button/Button";
import { Checkbox } from "../../../components/common/Checkbox/Checkbox";
import { Input } from "../../../components/common/Input/Input";
import { PasswordInput } from "../../../components/common/PasswordInput/PasswordInput";
import { PasswordRequirements } from "../../../components/common/PasswordRequirements/PasswordRequirements";
import { AuthLayout } from "../../../layouts/AuthLayout/AuthLayout";
import { register } from "../../../services/authService";
import type { RegisterAccountType } from "../../../types/auth";
import { getApiErrorMessage } from "../../../utils/apiErrors";
import "./Register.css";

interface RegisterFormData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  accountType: AccountType | "";
  acceptedTerms: boolean;
}

interface RegisterFormErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  accountType?: string;
  acceptedTerms?: string;
  form?: string;
}

const initialFormData: RegisterFormData = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  accountType: "",
  acceptedTerms: false,
};

function hasStrongPassword(password: string) {
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
}

function normalizePhone(phone: string) {
  return phone.replace(/[^0-9]/g, "");
}

function mapRegisterAccountType(value: AccountType): RegisterAccountType {
  switch (value) {
    case "conductor":
      return "Conductor";
    case "monitor":
      return "Monitor";
  }
}

function validateRegisterForm(data: RegisterFormData): RegisterFormErrors {
  const errors: RegisterFormErrors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneDigits = normalizePhone(data.phone);

  if (data.fullName.trim().length < 3) {
    errors.fullName = "Ingresa tu nombre completo";
  }

  if (!data.email.trim()) {
    errors.email = "El correo electrónico es obligatorio.";
  } else if (!emailPattern.test(data.email.trim())) {
    errors.email = "Ingresa un correo electrónico válido.";
  }

  if (!/^\d{10}$/.test(phoneDigits) || /^0+$/.test(phoneDigits)) {
    errors.phone = "Ingresa un teléfono de 10 dígitos sin lada";
  }

  if (!data.password) {
    errors.password = "La contraseña es obligatoria.";
  } else if (!hasStrongPassword(data.password)) {
    errors.password = "La contraseña no cumple los requisitos mínimos.";
  }

  if (!data.confirmPassword) {
    errors.confirmPassword = "Confirma tu contraseña.";
  } else if (data.confirmPassword !== data.password) {
    errors.confirmPassword = "Las contraseñas no coinciden";
  }

  if (!data.accountType) {
    errors.accountType = "Selecciona un tipo de cuenta";
  }

  if (!data.acceptedTerms) {
    errors.acceptedTerms = "Debes aceptar los términos y la política de privacidad";
  }

  return errors;
}

export function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RegisterFormData>(initialFormData);
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const updateField = <Field extends keyof RegisterFormData>(field: Field, value: RegisterFormData[Field]) => {
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
    setInfoMessage("");

    const nextErrors = validateRegisterForm(formData);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || !formData.accountType) {
      return;
    }

    const normalizedEmail = formData.email.trim().toLowerCase();
    setIsSubmitting(true);

    try {
      await register({
        fullName: formData.fullName.trim(),
        email: normalizedEmail,
        phoneNumber: formData.phone.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        accountType: mapRegisterAccountType(formData.accountType),
        acceptTerms: formData.acceptedTerms,
      });

      setSuccessMessage("Cuenta creada correctamente. Ya puedes iniciar sesión");

      window.setTimeout(() => {
        navigate("/login", {
          state: {
            message: "Cuenta creada correctamente. Ya puedes iniciar sesión",
          },
        });
      }, 900);
    } catch (error) {
      setErrors({ form: getApiErrorMessage(error) });
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <section className="register-card" aria-labelledby="register-title">
        <AuthTabs />

        <div className="register-card__heading">
          <p>Empieza con MotoSOS</p>
          <h2 id="register-title">Crea tu cuenta</h2>
        </div>

        <form className="register-form" noValidate onSubmit={handleSubmit}>
          {errors.form ? <AlertMessage variant="error">{errors.form}</AlertMessage> : null}

          <Input
            autoComplete="name"
            error={errors.fullName}
            id="fullName"
            label="Nombre completo"
            name="fullName"
            onChange={(event) => updateField("fullName", event.target.value)}
            placeholder="Ej. Juan Pérez"
            type="text"
            value={formData.fullName}
          />

          <Input
            autoComplete="email"
            error={errors.email}
            id="registerEmail"
            label="Correo electrónico"
            name="email"
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="ejemplo@correo.com"
            type="email"
            value={formData.email}
          />

          <Input
            autoComplete="tel"
            error={errors.phone}
            id="phone"
            inputMode="numeric"
            label="Teléfono móvil"
            maxLength={10}
            name="phone"
            onChange={(event) => updateField("phone", normalizePhone(event.target.value).slice(0, 10))}
            pattern="[0-9]{10}"
            placeholder="Ej. 7711234567"
            type="text"
            value={formData.phone}
          />

          <div className="register-form__password-grid">
            <div>
              <PasswordInput
                aria-describedby="password-requirements"
                autoComplete="new-password"
                error={errors.password}
                id="registerPassword"
                label="Contraseña"
                name="password"
                onChange={(event) => updateField("password", event.target.value)}
                placeholder="Ej. MotoSOS2026"
                value={formData.password}
              />
              <PasswordRequirements id="password-requirements" password={formData.password} />
            </div>

            <PasswordInput
              autoComplete="new-password"
              error={errors.confirmPassword}
              id="confirmPassword"
              label="Confirmar contraseña"
              name="confirmPassword"
              onChange={(event) => updateField("confirmPassword", event.target.value)}
              placeholder="Ej. MotoSOS2026"
              value={formData.confirmPassword}
            />
          </div>

          <AccountTypeSelector
            error={errors.accountType}
            name="accountType"
            onChange={(value) => updateField("accountType", value)}
            value={formData.accountType}
          />

          <div className="register-form__terms">
            <Checkbox
              aria-describedby={errors.acceptedTerms ? "acceptedTerms-error" : undefined}
              aria-invalid={Boolean(errors.acceptedTerms)}
              checked={formData.acceptedTerms}
              id="acceptedTerms"
              label="Acepto los términos y la política de privacidad"
              name="acceptedTerms"
              onChange={(event) => updateField("acceptedTerms", event.target.checked)}
            />
            <p className="register-form__legal-links">
              Lee nuestros{" "}
              <button
                onClick={() => setInfoMessage("Los términos estarán disponibles antes de la activación final de la cuenta.")}
                type="button"
              >
                Términos y condiciones
              </button>{" "}
              y la{" "}
              <button
                onClick={() => setInfoMessage("El aviso de privacidad se muestra durante la confirmación de la configuración.")}
                type="button"
              >
                Política de privacidad
              </button>
              .
            </p>
            {errors.acceptedTerms ? (
              <p className="register-form__field-error" id="acceptedTerms-error" role="alert">
                {errors.acceptedTerms}
              </p>
            ) : null}
          </div>

          <Button disabled={isSubmitting} isLoading={isSubmitting} loadingText="Creando cuenta..." type="submit">
            Crear cuenta
          </Button>

          {successMessage ? <AlertMessage variant="success">{successMessage}</AlertMessage> : null}
          {infoMessage ? <AlertMessage variant="info">{infoMessage}</AlertMessage> : null}
        </form>

        <p className="register-card__footer">
          ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>

        <aside className="register-card__info" aria-label="Información sobre el registro web">
          <h3>Todo comienza en el portal web</h3>
          <p>
            Antes de usar la app móvil, completa tu registro aquí, configura tu perfil y agrega tus contactos de emergencia. Así
            garantizamos tu seguridad desde el primer momento.
          </p>
        </aside>
      </section>
    </AuthLayout>
  );
}
