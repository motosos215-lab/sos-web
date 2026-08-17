import { useNavigate } from "react-router-dom";
import { Button } from "../../components/common/Button/Button";
import { useLogout } from "../../hooks/useLogout";
import { getSession } from "../../services/sessionService";
import "./Dashboard.css";

export function Dashboard() {
  const navigate = useNavigate();
  const session = getSession();
  const { performLogout } = useLogout();

  const handleLogout = () => {
    performLogout();
  };

  return (
    <main className="dashboard-page">
      <section className="dashboard-card" aria-labelledby="dashboard-title">
        <div className="dashboard-card__logo" aria-hidden="true">
          MS
        </div>
        <p className="dashboard-card__eyebrow">Sesión activa</p>
        <h1 id="dashboard-title">Dashboard MotoSOS</h1>
        <p>Consulta tu resumen operativo y configuración de MotoSOS.</p>
        {session ? <strong>{session.name}</strong> : null}
        <div className="dashboard-card__actions">
          <Button onClick={handleLogout} type="button" variant="secondary">
            Cerrar sesión
          </Button>
          <Button onClick={() => navigate("/dashboard/resumen")} type="button">
            Ir al resumen
          </Button>
        </div>
      </section>
    </main>
  );
}
