import type { InputHTMLAttributes } from "react";
import "./Checkbox.css";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export function Checkbox({ id, label, ...props }: CheckboxProps) {
  return (
    <label className="checkbox" htmlFor={id}>
      <input className="checkbox__input" id={id} type="checkbox" {...props} />
      <span className="checkbox__box" aria-hidden="true" />
      <span className="checkbox__label">{label}</span>
    </label>
  );
}
