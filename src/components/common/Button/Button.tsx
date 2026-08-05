import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import "./Button.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  variant?: "primary" | "secondary";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  children,
  className = "",
  disabled,
  isLoading = false,
  loadingText = "Procesando...",
  type = "button",
  variant = "primary",
  ...props
}, ref) {
  return (
    <button
      aria-busy={isLoading}
      className={`button button--${variant} ${className}`.trim()}
      disabled={disabled || isLoading}
      ref={ref}
      type={type}
      {...props}
    >
      {isLoading ? loadingText : children}
    </button>
  );
});
