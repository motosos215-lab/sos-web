import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CircleCheck } from "lucide-react";
import { Button } from "../../components/common/Button/Button";

interface NotificationsPopoverProps {
  onClose: () => void;
}

export function NotificationsPopover({ onClose }: NotificationsPopoverProps) {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const firstButton = panelRef.current?.querySelector<HTMLButtonElement>("button");
    firstButton?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <section className="notifications-popover" aria-label="Notificaciones recientes" ref={panelRef}>
      <h2>Notificaciones</h2>
      <ul>
        <li><Bell aria-hidden="true" size={16} /> Nuevo incidente crítico detectado</li>
        <li><CircleCheck aria-hidden="true" size={16} /> Un contacto confirmó la recepción de una alerta</li>
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
