import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useLogout } from "../../hooks/useLogout";
import { getSession } from "../../services/sessionService";
import { DashboardMobileMenu } from "./DashboardMobileMenu";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopbar } from "./DashboardTopbar";
import "./DashboardLayout.css";

export function DashboardLayout() {
  const session = getSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { performLogout } = useLogout();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    setIsMenuOpen(false);
    performLogout();
  };

  return (
    <main className="dashboard-layout">
      <div className="dashboard-layout__sidebar">
        <DashboardSidebar onLogout={handleLogout} session={session} />
      </div>
      <DashboardMobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} onLogout={handleLogout} session={session} />
      <div className="dashboard-layout__main">
        <DashboardTopbar
          isMenuOpen={isMenuOpen}
          onLogout={handleLogout}
          onToggleMenu={() => setIsMenuOpen((current) => !current)}
          session={session}
        />
        <section className="dashboard-layout__content" aria-label="Contenido del dashboard">
          <Outlet />
        </section>
      </div>
    </main>
  );
}
