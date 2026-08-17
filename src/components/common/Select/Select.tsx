import type { SelectHTMLAttributes } from "react";
import "./Select.css";

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label: string;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({ className = "", error, id, label, options, placeholder, ...props }: SelectProps) {
  const errorId = error ? `${id}-error` : undefined;
  const { "aria-describedby": ariaDescribedBy, ...selectProps } = props;
  const describedBy = [ariaDescribedBy, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`select-field ${className}`.trim()}>
      <label className="select-field__label" htmlFor={id}>
        {label}
      </label>
      <select {...selectProps} aria-describedby={describedBy} aria-invalid={Boolean(error)} className="select-field__control" id={id}>
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="select-field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
