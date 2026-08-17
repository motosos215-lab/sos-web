import { useEffect, useRef } from "react";
import { Button } from "../../../components/common/Button/Button";

interface ConfirmActionModalProps {
  confirmLabel: string;
  isProcessing: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}

export function ConfirmActionModal({ confirmLabel, isProcessing, message, onCancel, onConfirm, title }: ConfirmActionModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const cancelButton = dialog?.querySelector<HTMLButtonElement>("button");
    cancelButton?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancelRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialog) {
        return;
      }

      const focusableElements = Array.from(dialog.querySelectorAll<HTMLElement>("button, [tabindex]:not([tabindex='-1'])")).filter(
        (element) => !element.hasAttribute("disabled"),
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
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
      previous?.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div className="contact-modal" role="presentation">
      <div aria-labelledby="confirm-action-title" aria-modal="true" className="confirm-modal" ref={dialogRef} role="dialog">
        <h2 id="confirm-action-title">{title}</h2>
        <p>{message}</p>
        <div className="confirm-modal__actions">
          <Button disabled={isProcessing} onClick={onCancel} type="button" variant="secondary">
            Cancelar
          </Button>
          <Button disabled={isProcessing} isLoading={isProcessing} loadingText="Procesando..." onClick={onConfirm} type="button">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
