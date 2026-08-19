import { useEffect, useRef } from "react";
import { Button } from "../../../components/common/Button/Button";
import type { MotoSosPlan } from "../../../types/plan";

interface UpgradeInAppModalProps {
  onClose: () => void;
  plan: MotoSosPlan;
}

export function UpgradeInAppModal({ onClose, plan }: UpgradeInAppModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const firstButton = dialog?.querySelector<HTMLButtonElement>("button");
    firstButton?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialog) {
        return;
      }

      const focusableElements = Array.from(dialog.querySelectorAll<HTMLElement>("button, [tabindex]:not([tabindex='-1'])")).filter(
        (element) => !element.hasAttribute("disabled"),
      );

      if (focusableElements.length === 0) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.setTimeout(() => returnFocusRef.current?.focus(), 0);
    };
  }, [onClose]);

  return (
    <div className="upgrade-modal" role="presentation">
      <div aria-labelledby="upgrade-modal-title" aria-modal="true" className="upgrade-modal__dialog" ref={dialogRef} role="dialog">
        <h2 id="upgrade-modal-title">Mejora tu plan desde la app MotoSOS</h2>
        <p>Las compras y mejoras de planes individuales se realizan desde la aplicación móvil MotoSOS mediante Google Play.</p>
        <p>
          <strong>Plan elegido:</strong> {plan.name}
        </p>
        <ol>
          <li>Abre la app MotoSOS.</li>
          <li>Inicia sesión con la misma cuenta.</li>
          <li>Entra en Plan y licencia.</li>
          <li>Selecciona el plan deseado.</li>
          <li>Completa la compra mediante Google Play.</li>
          <li>Regresa a la web y actualiza el estado del plan.</li>
        </ol>
        <div className="upgrade-modal__actions">
          <Button onClick={onClose} type="button" variant="secondary">
            Cerrar
          </Button>
          <Button onClick={onClose} type="button">
            Entendido
          </Button>
        </div>
      </div>
    </div>
  );
}
