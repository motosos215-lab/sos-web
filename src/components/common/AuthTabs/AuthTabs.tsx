import { NavLink } from "react-router-dom";
import "./AuthTabs.css";

export function AuthTabs() {
  return (
    <nav className="auth-tabs" aria-label="Opciones de autenticación">
      <NavLink className="auth-tabs__item" to="/login">
        Iniciar sesión
      </NavLink>
      <NavLink className="auth-tabs__item" to="/register">
        Crear cuenta
      </NavLink>
    </nav>
  );
}
