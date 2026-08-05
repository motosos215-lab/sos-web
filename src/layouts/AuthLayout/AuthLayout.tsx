import type { ReactNode } from "react";
import "./AuthLayout.css";

interface AuthLayoutProps {
  children: ReactNode;
}

const benefits = [
  {
    icon: "01",
    title: "Respuesta más rápida.",
    description: "Alerta a contactos y servicios de emergencia en segundos.",
  },
  {
    icon: "02",
    title: "Monitoreo inteligente.",
    description: "Seguimiento en tiempo real y detección de incidentes.",
  },
  {
    icon: "03",
    title: "Conectado contigo.",
    description: "App móvil, smartwatch y web siempre sincronizados.",
  },
];

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="auth-layout">
      <section className="auth-layout__info" aria-label="Información de MotoSOS">
        <div className="auth-layout__brand">
          <div className="auth-layout__logo" aria-label="Logo temporal de MotoSOS">
            MS
          </div>
          <div>
            <p className="auth-layout__brand-name">MotoSOS</p>
            <p className="auth-layout__tagline">Sistema de emergencia para motocicletas</p>
          </div>
        </div>

        <div className="auth-layout__hero-copy">
          <p className="auth-layout__eyebrow">Protección activa 24/7</p>
          <h1>Tu seguridad, nuestra misión</h1>
          <p>MotoSOS te conecta con ayuda inmediata cuando más lo necesitas</p>
        </div>

        <div className="auth-layout__benefits" aria-label="Beneficios de MotoSOS">
          {benefits.map((benefit) => (
            <article className="auth-layout__benefit" key={benefit.title}>
              <span className="auth-layout__benefit-icon" aria-hidden="true">
                {benefit.icon}
              </span>
              <div>
                <h2>{benefit.title}</h2>
                <p>{benefit.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="auth-layout__content" aria-label="Acceso a MotoSOS">
        <header className="auth-layout__topbar">
          <a href="mailto:soporte@motosos.local">Soporte y ayuda</a>
          <button aria-label="Idioma actual: Español" type="button">
            Español
          </button>
        </header>
        <div className="auth-layout__panel">{children}</div>
      </section>
    </main>
  );
}
