import type { TextareaHTMLAttributes } from "react";
import "./Textarea.css";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label: string;
}

export function Textarea({ className = "", error, id, label, ...props }: TextareaProps) {
  const errorId = error ? `${id}-error` : undefined;
  const { "aria-describedby": ariaDescribedBy, ...textareaProps } = props;
  const describedBy = [ariaDescribedBy, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`textarea-field ${className}`.trim()}>
      <label className="textarea-field__label" htmlFor={id}>
        {label}
      </label>
      <textarea
        {...textareaProps}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        className="textarea-field__control"
        id={id}
      />
      {error ? (
        <p className="textarea-field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
