import { useEffect, useRef, useState } from "react";
import { Bell, LogOut, Menu, Search, Settings, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { SimulatedSession } from "../../services/sessionService";
import { getInitials, getRoleLabel } from "./dashboardUser";
import { NotificationsPopover } from "./NotificationsPopover";

interface DashboardTopbarProps {
  isMenuOpen: boolean;
  onLogout: () => void;
  onToggleMenu: () => void;
  session: SimulatedSession;
}

export function DashboardTopbar({ isMenuOpen, onLogout, onToggleMenu, session }: DashboardTopbarProps) {
  const navigate = useNavigate();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const profileRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Node ? event.target : null;

      if (target && !profileRef.current?.contains(target)) {
        setIsProfileOpen(false);
      }

      if (target && !notificationsRef.current?.contains(target)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <header className="dashboard-topbar">
      <button
        aria-expanded={isMenuOpen}
        aria-label={isMenuOpen ? "Cerrar menú del dashboard" : "Abrir menú del dashboard"}
        className="dashboard-topbar__menu"
        onClick={onToggleMenu}
        type="button"
      >
        <Menu aria-hidden="true" size={18} />
        Menú
      </button>

      <form
        className="dashboard-search"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const query = String(data.get("search") ?? "").trim();
          setSearchMessage(
            query
              ? session.role === "monitor"
                ? "Las alertas asignadas se muestran en el resumen"
                : "Usa el filtro de Incidentes para búsquedas detalladas"
              : "Ingresa un término de búsqueda",
          );
          if (query && session.role !== "monitor") {
            navigate("/dashboard/incidentes");
          }
        }}
      >
        <label className="sr-only" htmlFor="dashboard-search">
          Buscar en el sistema
        </label>
        <Search aria-hidden="true" size={18} />
        <input id="dashboard-search" name="search" placeholder="Ej. alerta, contacto o folio" type="search" />
      </form>

      <div className="dashboard-topbar__actions">
        {searchMessage ? (
          <span className="dashboard-topbar__message" aria-live="polite">
            {searchMessage}
          </span>
        ) : null}
        <div className="dashboard-topbar__notifications" ref={notificationsRef}>
          <button
            aria-expanded={isNotificationsOpen}
            aria-label="Abrir notificaciones"
            ref={notificationsButtonRef}
            onClick={() => setIsNotificationsOpen((current) => !current)}
            type="button"
          >
            <Bell aria-hidden="true" size={18} />
          </button>
          {isNotificationsOpen ? (
            <NotificationsPopover
              onClose={() => {
                setIsNotificationsOpen(false);
                notificationsButtonRef.current?.focus();
              }}
            />
          ) : null}
        </div>

        <div className="dashboard-profile" ref={profileRef}>
          <button
            aria-expanded={isProfileOpen}
            className="dashboard-profile__button"
            onClick={() => setIsProfileOpen((current) => !current)}
            type="button"
          >
            <span className="dashboard-avatar" aria-hidden="true">
              {getInitials(session.name)}
            </span>
            <span>
              <strong>{session.name}</strong>
              <small>{getRoleLabel(session.role)}</small>
            </span>
          </button>
          {isProfileOpen ? (
            <div className="dashboard-profile__menu" role="menu">
              <button onClick={() => navigate("/dashboard/configuracion")} role="menuitem" type="button">
                <UserRound aria-hidden="true" size={16} /> Mi perfil
              </button>
              <button onClick={() => navigate("/dashboard/configuracion")} role="menuitem" type="button">
                <Settings aria-hidden="true" size={16} /> Configuración
              </button>
              <button onClick={onLogout} role="menuitem" type="button">
                <LogOut aria-hidden="true" size={16} /> Cerrar sesión
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
