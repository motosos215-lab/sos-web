import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import "../Input/Input.css";
import "./PasswordInput.css";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  error?: string;
  label: string;
}

export function PasswordInput({ error, id, label, ...props }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const errorId = error ? `${id}-error` : undefined;
  const { "aria-describedby": ariaDescribedBy, ...inputProps } = props;
  const describedBy = [ariaDescribedBy, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="input-field password-field">
      <label className="input-field__label" htmlFor={id}>
        {label}
      </label>
      <div className="password-field__control-wrap">
        <input
          {...inputProps}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className="input-field__control password-field__control"
          id={id}
          type={isVisible ? "text" : "password"}
        />
        <button
          aria-label={isVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="password-field__toggle"
          onClick={() => setIsVisible((current) => !current)}
          type="button"
        >
          {isVisible ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      {error ? (
        <p className="input-field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
