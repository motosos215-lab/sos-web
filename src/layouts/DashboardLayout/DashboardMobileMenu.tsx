import type { SimulatedSession } from "../../services/sessionService";
import { DashboardSidebar } from "./DashboardSidebar";

interface DashboardMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  session: SimulatedSession;
}

export function DashboardMobileMenu({ isOpen, onClose, onLogout, session }: DashboardMobileMenuProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="dashboard-mobile-menu" role="presentation">
      <button aria-label="Cerrar menú" className="dashboard-mobile-menu__backdrop" onClick={onClose} type="button" />
      <div className="dashboard-mobile-menu__panel">
        <DashboardSidebar onLogout={onLogout} onNavigate={onClose} session={session} />
      </div>
    </div>
  );
}
