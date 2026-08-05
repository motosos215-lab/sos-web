import { type ReactNode, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getSetupSteps, type SetupNavigationKey, type SetupStep } from "../../config/setupSteps";
import { useLogout } from "../../hooks/useLogout";
import { getSession } from "../../services/sessionService";
import "./SetupLayout.css";

export type { SetupNavigationKey } from "../../config/setupSteps";

type RightPanelPlacement = "sidebar" | "responsive" | "hidden";

interface SetupLayoutProps {
  activeStep: SetupNavigationKey;
  children: ReactNode;
  progressPanel?: ReactNode;
  rightPanelPlacement?: RightPanelPlacement;
}

function getInitials(name: string) {
  return name.trim().charAt(0).toUpperCase() || "U";
}

function SetupSidebar({ onLogout, steps }: { onLogout: () => void; steps: SetupStep[] }) {
  return (
    <aside className="setup-sidebar" aria-label="Configuración inicial">
      <div className="setup-sidebar__brand">
        <div className="setup-sidebar__logo" aria-hidden="true">MS</div>
        <div>
          <p>MotoSOS</p>
          <span>Sistema de emergencia para motociclistas</span>
        </div>
      </div>

      <nav className="setup-sidebar__nav" aria-label="Pasos de configuración">
        {steps.map((step) => (
          <Link
            aria-current={step.status === "current" ? "step" : undefined}
            className={`setup-sidebar__step setup-sidebar__step--${step.status}`}
            key={step.key}
            to={step.path}
          >
            <span className="setup-sidebar__step-marker" aria-hidden="true">
              {step.status === "completed" ? "OK" : step.id}
            </span>
            <span>
              <strong>{step.label}</strong>
              <small>
                {step.status === "completed" ? "Completado" : step.status === "current" ? "En progreso" : "Pendiente"}
              </small>
            </span>
          </Link>
        ))}
      </nav>

      <button className="setup-sidebar__logout" onClick={onLogout} type="button">
        Cerrar sesión
      </button>
    </aside>
  );
}

function SetupTopbar({ name, onMenuClick }: { name: string; onMenuClick: () => void }) {
  return (
    <header className="setup-topbar">
      <button className="setup-topbar__menu" onClick={onMenuClick} type="button">
        Menú
      </button>
      <div className="setup-topbar__links">
        <a href="mailto:soporte@motosos.local">Soporte y ayuda</a>
        <button aria-label="Idioma actual: Español" type="button">Español</button>
      </div>
      <div className="setup-topbar__user" aria-label={`Usuario actual: ${name}`}>
        <span aria-hidden="true">{getInitials(name)}</span>
        <strong>{name}</strong>
      </div>
    </header>
  );
}

function SetupStepper({ steps }: { steps: SetupStep[] }) {
  const stepperRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const currentItem = stepperRef.current?.querySelector<HTMLLIElement>(".setup-stepper__item--current");
    currentItem?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [steps]);

  return (
    <nav className="setup-stepper" ref={stepperRef} aria-label="Progreso horizontal de configuración">
      <ol>
        {steps.map((step) => (
          <li className={`setup-stepper__item setup-stepper__item--${step.status}`} key={step.key}>
            <Link aria-current={step.status === "current" ? "step" : undefined} to={step.path}>
              <span aria-hidden="true">{step.status === "completed" ? "OK" : step.id}</span>
              <strong>{step.shortLabel}</strong>
              <small>{step.status === "completed" ? "Completado" : step.status === "current" ? "En progreso" : "Pendiente"}</small>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function SetupProgressPanel({ steps }: { steps: SetupStep[] }) {
  const currentStep = steps.find((step) => step.status === "current");
  const allCompleted = steps.length > 0 && steps.every((step) => step.status === "completed");
  const completedCount = steps.filter((step) => step.status === "completed").length;
  const percentage = Math.round((completedCount / steps.length) * 100);
  const isVehicleStep = currentStep?.key === "motocicleta";
  const isContactsStep = currentStep?.key === "contactos";
  const isDevicesStep = currentStep?.key === "dispositivos";
  const isConfirmationStep = currentStep?.key === "confirmacion";

  const statusText = allCompleted
    ? "Tu cuenta está activa y lista"
    : isConfirmationStep
      ? "Revisa tu información y activa la cuenta"
      : isVehicleStep
        ? "Registra el vehículo que utilizarás en tus viajes monitoreados"
        : isContactsStep
          ? "Agrega y envía una invitación a tu contacto de emergencia"
          : isDevicesStep
            ? "Vincula tu aplicación móvil para continuar con la configuración"
            : "Completa este paso para avanzar en tu configuración inicial.";
  const planText = isVehicleStep
    ? "Tu plan permite registrar un vehículo"
    : isContactsStep
      ? "Tu plan permite registrar un contacto de emergencia"
      : "Funciones esenciales activas";

  return (
    <aside className="setup-progress" aria-label="Progreso y recomendaciones">
      <section className="setup-progress__card setup-progress__summary">
        <h2>Tu progreso</h2>
        <div className="setup-progress__circle" aria-label={`${percentage}% completado`}>
          {percentage}%
        </div>
        <p>{completedCount} de {steps.length} pasos completados</p>
      </section>

      <section className="setup-progress__card">
        <h2>Estado del registro</h2>
        <span className="setup-progress__badge">{allCompleted ? "Completado" : "En progreso"}</span>
        <p>{statusText}</p>
      </section>

      <section className="setup-progress__card">
        <h2>Plan actual</h2>
        <strong>Básico</strong>
        <p>{planText}</p>
        <Link to="/configuracion/plan">Ver planes y beneficios</Link>
      </section>

      <section className="setup-progress__card">
        <h2>Recomendaciones</h2>
        <ul>
          {allCompleted ? (
            <>
              <li>Comprueba la batería de tus dispositivos antes de viajar.</li>
              <li>Pide a tu contacto que acepte la invitación desde la app.</li>
              <li>Agrega documentos y datos opcionales desde el dashboard.</li>
            </>
          ) : isConfirmationStep ? (
            <>
              <li>Revisa que cada módulo esté completado.</li>
              <li>Confirma que tus datos sean correctos antes de activar.</li>
              <li>Podrás editar esta información después desde el dashboard.</li>
            </>
          ) : isVehicleStep ? (
            <>
              <li>Verifica que los datos sean correctos.</li>
              <li>No dejes espacios innecesarios en placa o VIN.</li>
              <li>Guarda tu información antes de continuar.</li>
            </>
          ) : isContactsStep ? (
            <>
              <li>Verifica que el teléfono y correo sean correctos.</li>
              <li>Activa las alertas críticas.</li>
              <li>Comparte el código solamente con la persona autorizada.</li>
            </>
          ) : isDevicesStep ? (
            <>
              <li>Vincula tus dispositivos siguiendo cada paso.</li>
              <li>Comprueba que se conecten correctamente.</li>
              <li>Mantén la batería de tus dispositivos cargada.</li>
            </>
          ) : (
            <>
              <li>Usa tu nombre real y datos correctos.</li>
              <li>Sube una licencia vigente y legible.</li>
              <li>Agrega al menos un contacto de emergencia.</li>
            </>
          )}
        </ul>
      </section>

      <section className="setup-progress__card">
        <h2>¿Necesitas ayuda?</h2>
        <button type="button">Ir a Soporte y ayuda</button>
      </section>
    </aside>
  );
}

export function SetupLayout({ activeStep, children, progressPanel, rightPanelPlacement = "sidebar" }: SetupLayoutProps) {
  const session = getSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { performLogout } = useLogout();
  const steps = getSetupSteps(activeStep, session?.setupCompleted === true);
  const userName = session?.name ?? "Usuario MotoSOS";

  const handleLogout = () => {
    setIsMenuOpen(false);
    performLogout();
  };

  const panel = progressPanel ?? <SetupProgressPanel steps={steps} />;
  const isResponsivePanel = rightPanelPlacement === "responsive";
  const isHiddenPanel = rightPanelPlacement === "hidden";

  const contentShellClass = [
    "setup-layout__content-shell",
    isResponsivePanel ? "setup-layout__content-shell--panel-below" : "",
    isHiddenPanel ? "setup-layout__content-shell--panel-hidden" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="setup-layout">
      <div className={`setup-layout__sidebar ${isMenuOpen ? "setup-layout__sidebar--open" : ""}`.trim()}>
        <SetupSidebar onLogout={handleLogout} steps={steps} />
      </div>

      <div className="setup-layout__main">
        <SetupTopbar name={userName} onMenuClick={() => setIsMenuOpen((current) => !current)} />
        <div className={contentShellClass}>
          <section className="setup-layout__content">
            <SetupStepper steps={steps} />
            {children}
          </section>
          {isResponsivePanel ? <div className="setup-layout__panel setup-layout__panel--below">{panel}</div> : isHiddenPanel ? null : panel}
        </div>
        <footer className="setup-layout__footer">MotoSOS configuración inicial. Datos simulados para desarrollo.</footer>
      </div>
    </main>
  );
}
