import { useEffect, useRef } from "react";
import { Button } from "../../../components/common/Button/Button";
import type { LinkedDevice } from "../../../types/device";

interface RevokeDeviceModalProps {
  device: LinkedDevice;
  isProcessing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RevokeDeviceModal({ device, isProcessing, onCancel, onConfirm }: RevokeDeviceModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const firstButton = dialog?.querySelector<HTMLButtonElement>("button");
    firstButton?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
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
  }, [onCancel]);

  const message =
    device.type === "mobile_app"
      ? "Al revocar la app móvil, deberás generar un nuevo código para volver a vincularla."
      : "El smartwatch dejará de aparecer como dispositivo activo en la web.";

  return (
    <div className="device-modal" role="presentation">
      <div aria-labelledby="revoke-device-title" aria-modal="true" className="device-modal__dialog" ref={dialogRef} role="dialog">
        <h2 id="revoke-device-title">¿Revocar dispositivo?</h2>
        <p>{message}</p>
        <div className="device-modal__actions">
          <Button disabled={isProcessing} onClick={onCancel} type="button" variant="secondary">
            Cancelar
          </Button>
          <Button disabled={isProcessing} isLoading={isProcessing} loadingText="Revocando..." onClick={onConfirm} type="button">
            Revocar dispositivo
          </Button>
        </div>
      </div>
    </div>
  );
}
