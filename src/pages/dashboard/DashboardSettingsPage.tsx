import { Link } from "react-router-dom";
import { Bell, Bike, CreditCard, Smartphone, User, Users } from "lucide-react";
import "./DashboardUtilityPages.css";

const settings = [
  { icon: User, title: "Perfil", description: "Datos personales, ciudad, salud y contacto provisional.", path: "/configuracion/perfil" },
  {
    icon: Bike,
    title: "Motocicleta",
    description: "Vehículo principal usado para viajes e incidentes.",
    path: "/configuracion/motocicleta",
  },
  { icon: Users, title: "Contactos", description: "Contactos de emergencia e invitaciones.", path: "/configuracion/contactos" },
  {
    icon: Smartphone,
    title: "Dispositivos",
    description: "App móvil, código de activación y estado de vinculación.",
    path: "/configuracion/dispositivos",
  },
  { icon: CreditCard, title: "Plan", description: "Suscripción actual y límites activos.", path: "/configuracion/plan" },
  {
    icon: Bell,
    title: "Notificaciones",
    description: "Canales, alertas críticas y horarios silenciosos.",
    path: "/dashboard/notificaciones",
  },
];

export function DashboardSettingsPage() {
  return (
    <div className="dashboard-utility">
      <header className="dashboard-utility__header">
        <div>
          <p>Centro de control</p>
          <h1>Configuración</h1>
          <span>Administra los módulos reales conectados al backend MotoSOS.</span>
        </div>
      </header>

      <section className="dashboard-utility__grid" aria-label="Opciones de configuración">
        {settings.map((item) => {
          const Icon = item.icon;
          return (
            <Link className="dashboard-utility__card" key={item.path} to={item.path}>
              <Icon aria-hidden="true" size={24} />
              <h2>{item.title}</h2>
              <p>{item.description}</p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
