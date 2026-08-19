import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "../../components/common/Button/Button";

interface NotificationsPopoverProps {
  onClose: () => void;
}

export function NotificationsPopover({ onClose }: NotificationsPopoverProps) {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const firstButton = panelRef.current?.querySelector<HTMLButtonElement>("button");
    firstButton?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <section className="notifications-popover" aria-label="Notificaciones recientes" ref={panelRef}>
      <h2>Notificaciones</h2>
      <ul>
        <li>
          <Bell aria-hidden="true" size={16} /> Revisa el historial real de entregas y preferencias.
        </li>
      </ul>
      <Button
        onClick={() => {
          onClose();
          navigate("/dashboard/notificaciones");
        }}
        type="button"
      >
        Ver todas las notificaciones
      </Button>
    </section>
  );
}
