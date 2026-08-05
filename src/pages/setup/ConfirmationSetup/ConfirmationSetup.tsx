import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Bike,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  ClipboardCheck,
  Info,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Watch,
} from "lucide-react";
import { AlertMessage } from "../../../components/common/AlertMessage/AlertMessage";
import { Button } from "../../../components/common/Button/Button";
import { Checkbox } from "../../../components/common/Checkbox/Checkbox";
import { SetupLayout } from "../../../layouts/SetupLayout/SetupLayout";
import { getStoredDevicesState } from "../../../services/deviceStorageService";
import { getStoredEmergencyContacts } from "../../../services/contactStorageService";
import { completeInitialSetup, getSetupSummary } from "../../../services/setupConfirmationService";
import { getSession } from "../../../services/sessionService";
import type {
  SetupCompletionValidation,
  SetupSummaryModule,
} from "../../../types/setupConfirmation";
import { InstructionsModal } from "./InstructionsModal";
import { SetupSummaryCard } from "./SetupSummaryCard";
import "./ConfirmationSetup.css";

type ModalKey = "app" | "viaje" | "dispositivos" | "terminos" | "privacidad";

const MODULE_ICONS: Record<SetupSummaryModule["key"], typeof ShieldCheck> = {
  cuenta: ShieldCheck,
  perfil: ClipboardCheck,
  motocicleta: Bike,
  contactos: AlertTriangle,
  dispositivos: Smartphone,
  plan: Sparkles,
};

function getModalContent(key: ModalKey): ReactNode {
  switch (key) {
    case "app":
      return (
        <>
          <p>Accede a las funciones de MotoSOS desde tu teléfono.</p>
          <ol>
            <li>Instala la app MotoSOS.</li>
            <li>Inicia sesión con la misma cuenta.</li>
            <li>Activa el monitoreo al comenzar tus viajes.</li>
          </ol>
        </>
      );
    case "viaje":
      return (
        <>
          <p>Así funciona el monitoreo de tus recorridos.</p>
          <ol>
            <li>Selecciona tu vehículo registrado.</li>
            <li>Inicia el viaje desde la app.</li>
            <li>MotoSOS detecta emergencias y contacta a tu contacto de emergencia.</li>
          </ol>
        </>
      );
    case "dispositivos":
      return (
        <>
          <p>Revisa la batería y la sincronización antes de viajar.</p>
          <ul>
            <li>Mantén la app abierta o activa el viaje.</li>
            <li>Revisa que tu smartwatch esté conectado.</li>
            <li>Carga la batería de tus dispositivos.</li>
          </ul>
        </>
      );
    case "terminos":
      return (
        <>
          <p>
            Los términos y condiciones completos estarán disponibles en la configuración del
            dashboard en una etapa posterior.
          </p>
          <p>Por ahora puedes continuar con la configuración de tu cuenta.</p>
        </>
      );
    case "privacidad":
      return (
        <>
          <p>
            La información personal, de emergencia y de dispositivos se utilizará únicamente para
            operar las funciones autorizadas de MotoSOS.
          </p>
          <p>
            El aviso de privacidad completo estará disponible en la configuración del dashboard en
            una etapa posterior.
          </p>
        </>
      );
  }
}

export function ConfirmationSetup() {
  const navigate = useNavigate();
  const session = getSession();
  const activated = session?.setupCompleted === true;

  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [validation, setValidation] = useState<SetupCompletionValidation | null>(null);
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false);
  const [checkboxError, setCheckboxError] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [areRecommendationsOpen, setAreRecommendationsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalKey | null>(null);

  const successTitleRef = useRef<HTMLHeadingElement | null>(null);

  const loadValidation = useCallback(() => {
    setPhase("loading");

    try {
      const result = getSetupSummary();
      setValidation(result);
      setPhase("ready");
    } catch {
      setValidation(null);
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    loadValidation();
  }, [loadValidation]);

  useEffect(() => {
    if (activated) {
      successTitleRef.current?.focus();
    }
  }, [activated]);

  const hasBlockingIssues = Boolean(validation?.blockingIssues.length);
  const canActivate = phase === "ready" && validation !== null && !hasBlockingIssues && !isActivating;

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsCheckboxChecked(event.target.checked);
    if (event.target.checked) {
      setCheckboxError(false);
    }
  };

  const handleActivate = async () => {
    if (isActivating) {
      return;
    }

    const revalidated = getSetupSummary();
    setValidation(revalidated);

    if (revalidated.blockingIssues.length > 0) {
      return;
    }

    if (!isCheckboxChecked) {
      setCheckboxError(true);
      return;
    }

    setCheckboxError(false);
    setIsActivating(true);

    try {
      const response = await completeInitialSetup();

      if (!response.success) {
        setValidation(getSetupSummary());
        return;
      }
    } catch {
      setValidation(getSetupSummary());
    } finally {
      setIsActivating(false);
    }
  };

  const handleGoToDashboard = () => {
    const currentSession = getSession();

    if (currentSession?.setupCompleted) {
      navigate("/dashboard/resumen");
    }
  };

  const handleFixModule = (module: SetupSummaryModule) => {
    if (module.editPath) {
      navigate(module.editPath);
    }
  };

  if (phase === "loading") {
    return (
      <SetupLayout activeStep="confirmacion">
        <section className="confirmation-setup" aria-busy="true" aria-live="polite">
          <div className="confirmation-setup__loading">
            <p>Revisando configuración...</p>
          </div>
        </section>
      </SetupLayout>
    );
  }

  if (phase === "error") {
    return (
      <SetupLayout activeStep="confirmacion">
        <section className="confirmation-setup">
          <AlertMessage variant="error">No pudimos revisar tu configuración.</AlertMessage>
          <div className="confirmation-setup__actions confirmation-setup__actions--center">
            <Button onClick={loadValidation} type="button">
              Reintentar
            </Button>
          </div>
        </section>
      </SetupLayout>
    );
  }

  if (activated) {
    const contact = getStoredEmergencyContacts().find((item) => item.id === session?.emergencyContactId);
    const devices = getStoredDevicesState();

    const activationItems = [
      { label: "Perfil", value: "Completado", status: "ok" },
      { label: "Motocicleta", value: "Registrada", status: "ok" },
      {
        label: "Contacto",
        value: contact?.invitationStatus === "linked" ? "Vinculado" : "Invitado",
        status: "ok",
      },
      { label: "App móvil", value: "Vinculada", status: "ok" },
      {
        label: "Smartwatch",
        value: devices.smartwatchDevice ? "Vinculado" : "Pendiente",
        status: devices.smartwatchDevice ? "ok" : "pending",
      },
      { label: "Plan", value: "Activo", status: "ok" },
    ];

    return (
      <SetupLayout activeStep="confirmacion">
        <section className="confirmation-setup confirmation-setup--success" aria-labelledby="confirmation-success-title">
          <header className="confirmation-setup__success-header">
            <span className="confirmation-setup__success-icon" aria-hidden="true">
              <CheckCircle2 size={56} />
            </span>
            <h1 id="confirmation-success-title" ref={successTitleRef} tabIndex={-1}>
              ¡Tu cuenta está lista!
            </h1>
            <p>
              Has completado todos los pasos. Tu cuenta MotoSOS está activa y lista para ayudarte en
              cada viaje.
            </p>
          </header>

          <section className="confirmation-setup__success-card" aria-label="Activación completada">
            <h2>¡Todo listo! Estás protegido en cada viaje</h2>
            <div className="confirmation-setup__success-progress" aria-label="100% completado">
              <CheckCircle2 aria-hidden="true" size={22} />
              100%
            </div>
            <p>Tu cuenta ha sido configurada correctamente</p>
          </section>

          <section className="confirmation-setup__activation-grid" aria-label="Resumen de activación">
            {activationItems.map((item) => (
              <div className={`confirmation-setup__activation-item confirmation-setup__activation-item--${item.status}`} key={item.label}>
                <CheckCircle2 aria-hidden="true" size={16} />
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </section>

          <section className="confirmation-setup__next-steps" aria-labelledby="confirmation-next-title">
            <h2 id="confirmation-next-title">Próximos pasos</h2>
            <div className="confirmation-setup__next-grid">
              <article className="confirmation-setup__next-card">
                <Smartphone aria-hidden="true" size={20} />
                <h3>Abre la app MotoSOS</h3>
                <p>Accede a las funciones desde tu teléfono</p>
                <Button onClick={() => setActiveModal("app")} type="button" variant="secondary">
                  Ver instrucciones
                </Button>
              </article>
              <article className="confirmation-setup__next-card">
                <Bike aria-hidden="true" size={20} />
                <h3>Inicia tu primer viaje</h3>
                <p>Activa el monitoreo al comenzar tu recorrido</p>
                <Button onClick={() => setActiveModal("viaje")} type="button" variant="secondary">
                  Cómo funciona
                </Button>
              </article>
              <article className="confirmation-setup__next-card">
                <Watch aria-hidden="true" size={20} />
                <h3>Revisa tus dispositivos</h3>
                <p>Comprueba batería y sincronización antes de viajar</p>
                <Button onClick={() => setActiveModal("dispositivos")} type="button" variant="secondary">
                  Ver guía rápida
                </Button>
              </article>
            </div>
          </section>

          <section className="confirmation-setup__actions confirmation-setup__actions--success" aria-label="Acciones finales">
            <Button onClick={() => setActiveModal("app")} type="button" variant="secondary">
              Abrir instrucciones de la app
            </Button>
            <Button onClick={handleGoToDashboard} type="button">
              Ir al Dashboard
            </Button>
          </section>
        </section>

        {activeModal ? (
          <InstructionsModal onClose={() => setActiveModal(null)} title={getModalTitle(activeModal)}>
            {getModalContent(activeModal)}
          </InstructionsModal>
        ) : null}
      </SetupLayout>
    );
  }

  return (
    <SetupLayout activeStep="confirmacion">
      <section className="confirmation-setup" aria-labelledby="confirmation-review-title">
        <header className="confirmation-setup__header">
          <p>Configuración inicial</p>
          <h1 id="confirmation-review-title">Revisa y confirma tu configuración</h1>
          <span>
            Verifica que la información esté correcta antes de activar completamente tu cuenta MotoSOS
          </span>
        </header>

        <div className="confirmation-setup__messages" aria-live="polite">
          {checkboxError ? (
            <AlertMessage variant="error">Debes confirmar que has revisado la información antes de activar tu cuenta.</AlertMessage>
          ) : null}
        </div>

        <p className="confirmation-setup__notice">
          <Info aria-hidden="true" size={16} />
          Antes de activar tu cuenta, revisa cada módulo. Si falta información, podrás corregirla
          desde esta pantalla o más adelante desde el dashboard.
        </p>

        {validation && validation.blockingIssues.length > 0 ? (
          <section className="confirmation-setup__blocking" aria-labelledby="confirmation-blocking-title">
            <h2 id="confirmation-blocking-title">
              <CircleAlert aria-hidden="true" size={18} />
              Completa los siguientes elementos
            </h2>
            <ul>
              {validation.blockingIssues.map((issue) => {
                const module = validation.modules.find((item) => item.blockingMessage === issue);

                return (
                  <li className="confirmation-setup__blocking-item" key={issue}>
                    <CircleAlert aria-hidden="true" size={16} />
                    <span>{issue}</span>
                    <Button
                      onClick={() => module && handleFixModule(module)}
                      type="button"
                      variant="secondary"
                    >
                      Corregir
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {validation && validation.warnings.length > 0 ? (
          <section className="confirmation-setup__recommendations" aria-labelledby="confirmation-recommendations-title">
            <button
              aria-expanded={areRecommendationsOpen}
              className="confirmation-setup__recommendations-toggle"
              onClick={() => setAreRecommendationsOpen((current) => !current)}
              type="button"
            >
              <span id="confirmation-recommendations-title">
                <AlertTriangle aria-hidden="true" size={16} />
                Recomendaciones antes de activar
              </span>
              <ChevronDown
                aria-hidden="true"
                className={areRecommendationsOpen ? "confirmation-setup__chevron--open" : ""}
                size={16}
              />
            </button>
            {areRecommendationsOpen ? (
              <ul className="confirmation-setup__recommendations-list">
                {validation.warnings.map((warning) => (
                  <li key={warning}>
                    <AlertTriangle aria-hidden="true" size={14} />
                    {warning}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        <div className="confirmation-setup__summary-grid">
          {validation?.modules.map((module) => (
            <SetupSummaryCard
              details={module.details}
              editPath={module.editPath}
              icon={MODULE_ICONS[module.key]}
              key={module.key}
              status={module.status}
              title={module.title}
              warning={module.warningMessage}
              blockingMessage={module.blockingMessage}
            />
          ))}
        </div>

        <section className="confirmation-setup__confirmation" aria-labelledby="confirmation-check-title">
          <h2 id="confirmation-check-title">Confirmación de datos</h2>
          <Checkbox
            aria-describedby={checkboxError ? "confirmation-check-error" : "confirmation-check-hint"}
            checked={isCheckboxChecked}
            id="confirmation-checkbox"
            label="He revisado la información y confirmo que los datos son correctos"
            onChange={handleCheckboxChange}
          />
          <p className="confirmation-setup__check-hint" id="confirmation-check-hint">
            Podrás actualizar esta información posteriormente desde la configuración del dashboard.
          </p>
          {checkboxError ? (
            <p className="confirmation-setup__check-error" id="confirmation-check-error" role="alert">
              Debes confirmar que has revisado la información.
            </p>
          ) : null}
        </section>

        <p className="confirmation-setup__privacy">
          La información personal, de emergencia y de dispositivos se utilizará únicamente para operar
          las funciones autorizadas de MotoSOS.
        </p>
        <div className="confirmation-setup__privacy-links">
          <button onClick={() => setActiveModal("terminos")} type="button">
            Términos y condiciones
          </button>
          <span aria-hidden="true">·</span>
          <button onClick={() => setActiveModal("privacidad")} type="button">
            Aviso de privacidad
          </button>
        </div>

        <section className="confirmation-setup__actions" aria-label="Acciones de confirmación">
          <Button
            disabled={isActivating}
            onClick={() => navigate("/configuracion/plan")}
            type="button"
            variant="secondary"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Anterior
          </Button>
          <Button
            disabled={!canActivate}
            isLoading={isActivating}
            loadingText="Activando cuenta..."
            onClick={handleActivate}
            type="button"
          >
            Activar mi cuenta
          </Button>
        </section>
      </section>

      {activeModal ? (
        <InstructionsModal onClose={() => setActiveModal(null)} title={getModalTitle(activeModal)}>
          {getModalContent(activeModal)}
        </InstructionsModal>
      ) : null}
    </SetupLayout>
  );
}

function getModalTitle(key: ModalKey): string {
  switch (key) {
    case "app":
      return "Instrucciones de la app MotoSOS";
    case "viaje":
      return "Cómo funciona el monitoreo";
    case "dispositivos":
      return "Guía rápida de dispositivos";
    case "terminos":
      return "Términos y condiciones";
    case "privacidad":
      return "Aviso de privacidad";
  }
}