import { Bike, CheckCircle2, LogOut, ShieldCheck, Smartphone, Sparkles, Users } from "lucide-react";
import { Button } from "../../components/common/Button/Button";
import { useLogout } from "../../hooks/useLogout";
import { getSession } from "../../services/sessionService";
import "./TemporaryWelcomePage.css";

export function TemporaryWelcomePage() {
  const session = getSession();
  const userName = session?.name ?? "Usuario MotoSOS";
  const { performLogout } = useLogout();

  const handleLogout = () => {
    performLogout();
  };

  const summaryItems = [
    { icon: ShieldCheck, label: "Cuenta", value: "Activa" },
    { icon: Bike, label: "Vehículo registrado", value: "Listo" },
    { icon: Users, label: "Contacto configurado", value: "Listo" },
    { icon: Smartphone, label: "App móvil vinculada", value: "Listo" },
    { icon: Sparkles, label: "Plan activo", value: "Listo" },
  ];

  return (
    <section className="temporary-welcome" aria-labelledby="temporary-welcome-title">
      <div className="temporary-welcome__card">
        <div className="temporary-welcome__logo" aria-hidden="true">MS</div>
        <p className="temporary-welcome__eyebrow">MotoSOS</p>
        <h1 id="temporary-welcome-title">Bienvenido a MotoSOS</h1>
        <strong className="temporary-welcome__name">{userName}</strong>

        <div className="temporary-welcome__badges">
          <span className="temporary-welcome__badge temporary-welcome__badge--success">
            <CheckCircle2 aria-hidden="true" size={14} />
            Cuenta configurada
          </span>
          <span className="temporary-welcome__badge">
            <ShieldCheck aria-hidden="true" size={14} />
            Cuenta activa
          </span>
        </div>

        <ul className="temporary-welcome__summary">
          {summaryItems.map((item) => (
            <li key={item.label}>
              <item.icon aria-hidden="true" size={16} />
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </li>
          ))}
        </ul>

        <p className="temporary-welcome__note">
          El dashboard operativo se implementará en la siguiente etapa.
        </p>

        <Button onClick={handleLogout} type="button" variant="secondary">
          <LogOut aria-hidden="true" size={16} />
          Cerrar sesión
        </Button>
      </div>
    </section>
  );
}
