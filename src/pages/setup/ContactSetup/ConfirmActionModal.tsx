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

export function ConfirmActionModal({
  confirmLabel,
  isProcessing,
  message,
  onCancel,
  onConfirm,
  title,
}: ConfirmActionModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const cancelButton = dialogRef.current?.querySelector<HTMLButtonElement>("button");
    cancelButton?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

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
