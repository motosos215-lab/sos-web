import { useEffect, useRef } from "react";
import type { SimulatedSession } from "../../services/sessionService";
import { DashboardSidebar } from "./DashboardSidebar";

interface DashboardMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  session: SimulatedSession;
}

export function DashboardMobileMenu({ isOpen, onClose, onLogout, session }: DashboardMobileMenuProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>("a, button, [tabindex]:not([tabindex='-1'])");
    firstFocusable?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previous?.focus({ preventScroll: true });
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="dashboard-mobile-menu" role="presentation">
      <button aria-label="Cerrar menú" className="dashboard-mobile-menu__backdrop" onClick={onClose} type="button" />
      <div className="dashboard-mobile-menu__panel" ref={panelRef}>
        <DashboardSidebar onLogout={onLogout} onNavigate={onClose} session={session} />
      </div>
    </div>
  );
}
