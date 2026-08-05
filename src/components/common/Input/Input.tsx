import type { InputHTMLAttributes } from "react";
import "./Input.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label: string;
}

export function Input({ className = "", error, id, label, ...props }: InputProps) {
  const errorId = error ? `${id}-error` : undefined;
  const { "aria-describedby": ariaDescribedBy, ...inputProps } = props;
  const describedBy = [ariaDescribedBy, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`input-field ${className}`.trim()}>
      <label className="input-field__label" htmlFor={id}>
        {label}
      </label>
      <input
        {...inputProps}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        className="input-field__control"
        id={id}
      />
      {error ? (
        <p className="input-field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
