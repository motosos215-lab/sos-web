import type { ReactNode } from "react";
import "./AlertMessage.css";

type AlertVariant = "success" | "error" | "info" | "warning";

interface AlertMessageProps {
  children: ReactNode;
  variant?: AlertVariant;
}

export function AlertMessage({ children, variant = "info" }: AlertMessageProps) {
  const isAssertive = variant === "error" || variant === "warning";

  return (
    <p
      aria-live={isAssertive ? "assertive" : "polite"}
      className={`alert-message alert-message--${variant}`}
      role={isAssertive ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
