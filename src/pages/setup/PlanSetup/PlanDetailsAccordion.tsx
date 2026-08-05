import { useState } from "react";
import { ChevronDown, Headphones, Info, RefreshCw } from "lucide-react";
import { Button } from "../../../components/common/Button/Button";
import type { AccountStatus } from "../../../services/sessionService";
import type { UserPlanState } from "../../../types/plan";

interface PlanDetailsAccordionProps {
  currentPlan: UserPlanState | null;
  accountStatus: AccountStatus;
  activatedAt: string | null;
  isRefreshing: boolean;
  lastRefresh: string;
  onRefreshStatus: () => void;
  userName: string;
}

const accountStatusLabels: Record<AccountStatus, string> = {
  active: "Activa",
  pending: "Pendiente",
  inactive: "Inactiva",
};

function formatDate(value: string | null) {
  if (!value) {
    return "Sin fecha disponible";
  }

  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function PlanDetailsAccordion({
  currentPlan,
  accountStatus,
  activatedAt,
  isRefreshing,
  lastRefresh,
  onRefreshStatus,
  userName,
}: PlanDetailsAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="plan-details" aria-labelledby="plan-details-title">
      <button
        aria-controls="plan-details-body"
        aria-expanded={isOpen}
        className="plan-details__summary"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="plan-details__icon" aria-hidden="true">
          <Info size={20} />
        </span>
        <span className="plan-details__summary-text">
          <strong id="plan-details-title">Información adicional</strong>
          <small>Consulta detalles de tu plan, estado de cuenta y ayuda</small>
        </span>
        <span className="plan-details__meta" aria-hidden="true">
          <span className="plan-details__badge">Plan: Básico</span>
          <span className="plan-details__badge">Cuenta: {accountStatusLabels[accountStatus]}</span>
        </span>
        <ChevronDown aria-hidden="true" className="plan-details__chevron" size={20} />
      </button>

      <div aria-hidden={!isOpen} className="plan-details__body" id="plan-details-body">
        <div className="plan-details__body-inner" inert={!isOpen}>
          <div className="plan-details__sections">
            <section className="plan-details__section" aria-labelledby="plan-details-section-plan">
              <h4 id="plan-details-section-plan">Plan actual</h4>
              <div className="plan-details__section-row">
                <span className="plan-details__status-badge">Activo</span>
                <span className="plan-details__value">Básico</span>
              </div>
              <p>Plan incluido con tu cuenta.</p>
              <div className="plan-details__refresh">
                <Button isLoading={isRefreshing} loadingText="Actualizando..." onClick={onRefreshStatus} type="button" variant="secondary">
                  <RefreshCw aria-hidden="true" size={16} />
                  Actualizar estado
                </Button>
                {lastRefresh ? <small aria-live="polite">Última consulta: {lastRefresh}</small> : null}
              </div>
            </section>

            <section className="plan-details__section" aria-labelledby="plan-details-section-account">
              <h4 id="plan-details-section-account">Estado de la cuenta</h4>
              <dl className="plan-details__dl">
                <div>
                  <dt>Estado</dt>
                  <dd>{accountStatusLabels[accountStatus]}</dd>
                </div>
                <div>
                  <dt>Activación</dt>
                  <dd>{formatDate(activatedAt)}</dd>
                </div>
                <div>
                  <dt>Tipo</dt>
                  <dd>Usuario</dd>
                </div>
                <div>
                  <dt>Nombre</dt>
                  <dd>{userName}</dd>
                </div>
              </dl>
            </section>

            <section className="plan-details__section" aria-labelledby="plan-details-section-info">
              <h4 id="plan-details-section-info">Información</h4>
              <p>Las compras del usuario particular se gestionan desde la app móvil.</p>
            </section>

            <section className="plan-details__section" aria-labelledby="plan-details-section-help">
              <h4 id="plan-details-section-help">Ayuda</h4>
              <p>¿Necesitas ayuda con tu plan o tu cuenta?</p>
              <a className="plan-details__support" href="mailto:soporte@motosos.local">
                <Headphones aria-hidden="true" size={16} />
                Ir a Soporte y ayuda
              </a>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
