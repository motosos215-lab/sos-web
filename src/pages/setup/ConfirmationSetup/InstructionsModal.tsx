import { type ReactNode, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "../../../components/common/Button/Button";

interface InstructionsModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function InstructionsModal({ title, children, onClose }: InstructionsModalProps) {
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
    <div className="confirmation-modal" role="presentation">
      <div
        aria-labelledby="confirmation-modal-title"
        aria-modal="true"
        className="confirmation-modal__dialog"
        ref={dialogRef}
        role="dialog"
      >
        <div className="confirmation-modal__header">
          <h2 id="confirmation-modal-title">{title}</h2>
          <button aria-label="Cerrar" className="confirmation-modal__close" onClick={onClose} type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="confirmation-modal__body">{children}</div>
        <div className="confirmation-modal__actions">
          <Button onClick={onClose} type="button">
            Entendido
          </Button>
        </div>
      </div>
    </div>
  );
}
