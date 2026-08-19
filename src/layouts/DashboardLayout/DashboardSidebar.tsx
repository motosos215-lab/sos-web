import { NavLink } from "react-router-dom";
import { Button } from "../../components/common/Button/Button";
import type { SimulatedSession } from "../../services/sessionService";
import { getDashboardNavItems } from "./dashboardNavigation";
import { getInitials, getRoleLabel } from "./dashboardUser";

interface DashboardSidebarProps {
  onNavigate?: () => void;
  onLogout: () => void;
  session: SimulatedSession;
}

export function DashboardSidebar({ onNavigate, onLogout, session }: DashboardSidebarProps) {
  const accountStatus = session.accountStatus === "active" ? "Cuenta activa" : "Cuenta pendiente";
  const navItems = getDashboardNavItems(session.role);

  return (
    <aside className="dashboard-sidebar" aria-label="Navegación principal del dashboard">
      <div className="dashboard-sidebar__brand">
        <div className="dashboard-sidebar__logo" aria-hidden="true">
          MS
        </div>
        <div>
          <strong>MotoSOS</strong>
          <span>Sistema de emergencia para motociclistas</span>
        </div>
      </div>

      <nav className="dashboard-sidebar__nav" aria-label="Secciones del dashboard">
        {navItems.map((item) => (
          <NavLink
            className={({ isActive }) => `dashboard-sidebar__link ${isActive ? "dashboard-sidebar__link--active" : ""}`.trim()}
            key={item.path}
            onClick={onNavigate}
            to={item.path}
          >
            {({ isActive }) => (
              <>
                <span className="dashboard-sidebar__icon" aria-hidden="true">
                  <item.icon size={18} />
                </span>
                <span>{item.label}</span>
                {isActive ? <span className="sr-only">Página actual</span> : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <section className="dashboard-sidebar__user" aria-label="Sesión activa">
        <div className="dashboard-avatar" aria-hidden="true">
          {getInitials(session.name)}
        </div>
        <div>
          <strong>{session.name}</strong>
          <span>{getRoleLabel(session.role)}</span>
          <small>
            {accountStatus} · Plan {session.plan}
          </small>
        </div>
        <Button onClick={onLogout} type="button" variant="secondary">
          Cerrar sesión
        </Button>
      </section>
    </aside>
  );
}
