import { AlertTriangle, BellRing, ExternalLink, Info, MapPin, ShieldAlert, ShieldCheck, Siren, Smartphone } from "lucide-react";
import { Button } from "../../../components/common/Button/Button";

interface PaymentInformationCardProps {
  onContinueBasic: () => void;
  onOpenUpgrade: () => void;
}

interface BusinessLicenseNoticeProps {
  isLoading: boolean;
  message: string;
  onRequestInformation: () => void;
}

const securityFeatures = [
  { Icon: Siren, label: "Botón SOS" },
  { Icon: ShieldAlert, label: "Detección básica de accidente" },
  { Icon: MapPin, label: "Ubicación de emergencia" },
  { Icon: BellRing, label: "Alertas esenciales" },
];

export function EssentialSecurityNotice() {
  return (
    <section className="plan-notice plan-notice--security" aria-labelledby="security-notice-title">
      <div className="plan-notice__header">
        <div className="plan-notice__icon" aria-hidden="true">
          <ShieldCheck size={20} />
        </div>
        <h2 id="security-notice-title">Funciones esenciales siempre activas</h2>
      </div>
      <p>Las funciones esenciales de seguridad permanecen activas en todos los planes.</p>
      <ul className="plan-notice__grid">
        {securityFeatures.map(({ Icon, label }) => (
          <li className="plan-notice__item" key={label}>
            <Icon aria-hidden="true" size={16} />
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PaymentInformationCard({ onContinueBasic, onOpenUpgrade }: PaymentInformationCardProps) {
  return (
    <section className="plan-notice plan-notice--payment" aria-labelledby="payment-info-title">
      <div className="plan-notice__payment-icon" aria-hidden="true">
        <Smartphone size={26} />
      </div>
      <div className="plan-notice__payment-body">
        <h2 id="payment-info-title">Gestiona tu plan desde la app</h2>
        <p>
          Las compras y mejoras de planes individuales se realizan desde la aplicación móvil MotoSOS mediante Google
          Play.
        </p>
        <p className="plan-notice__payment-note">
          <Info aria-hidden="true" size={15} />
          Este portal no solicita datos bancarios.
        </p>
        <div className="plan-notice__actions">
          <Button onClick={onOpenUpgrade} type="button" variant="secondary">
            <ExternalLink aria-hidden="true" size={16} />
            Ver cómo mejorar mi plan
          </Button>
          <Button onClick={onContinueBasic} type="button">
            Continuar con plan Básico
          </Button>
        </div>
      </div>
    </section>
  );
}

export function BusinessLicenseNotice({ isLoading, message, onRequestInformation }: BusinessLicenseNoticeProps) {
  return (
    <section className="plan-notice plan-notice--business" aria-labelledby="business-license-title">
      <div className="plan-notice__header">
        <div className="plan-notice__icon" aria-hidden="true">
          <Info size={20} />
        </div>
        <h2 id="business-license-title">Licenciamiento empresarial</h2>
      </div>
      <p>Las licencias empresariales o institucionales son administradas por un responsable autorizado.</p>
      {message ? <p className="plan-notice__message" aria-live="polite">{message}</p> : null}
      <div className="plan-notice__actions">
        <Button isLoading={isLoading} loadingText="Solicitando..." onClick={onRequestInformation} type="button" variant="secondary">
          Solicitar información
        </Button>
      </div>
    </section>
  );
}

export function PlanLimitWarning({ message }: { message: string }) {
  return (
    <section className="plan-limit-warning" aria-live="assertive" role="alert">
      <div className="plan-limit-warning__header">
        <div className="plan-limit-warning__icon" aria-hidden="true">
          <AlertTriangle size={20} />
        </div>
        <h2>Revisa los límites del plan</h2>
      </div>
      <p>{message}</p>
    </section>
  );
}
