import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AlertMessage } from "../../../components/common/AlertMessage/AlertMessage";
import { Button } from "../../../components/common/Button/Button";
import { SetupLayout } from "../../../layouts/SetupLayout/SetupLayout";
import { getStoredEmergencyContacts } from "../../../services/contactStorageService";
import { getSession, updateSession } from "../../../services/sessionService";
import {
  getAvailablePlans,
  getCurrentPlan,
  requestBusinessLicenseInformation,
  confirmCurrentPlan,
  refreshPlanStatus,
} from "../../../services/planService";
import type { MotoSosPlan, UserPlanState } from "../../../types/plan";
import { getApiErrorMessage } from "../../../utils/apiErrors";
import { PlanDetailsAccordion } from "./PlanDetailsAccordion";
import { PlanPagination } from "./PlanPagination";
import { BusinessLicenseNotice, EssentialSecurityNotice, PaymentInformationCard, PlanLimitWarning } from "./PlanSupportCards";
import { UpgradeInAppModal } from "./UpgradeInAppModal";
import "./PlanSetup.css";

function getLimitWarning(currentPlan: UserPlanState | null) {
  if (!currentPlan) {
    return "";
  }

  const contactsCount = getStoredEmergencyContacts().length;
  const session = getSession();
  const vehicleCount = session?.vehicleRegistered ? 1 : 0;
  const driverCount = 1;

  const exceedsContacts = currentPlan.contactLimit !== null && contactsCount > currentPlan.contactLimit;
  const exceedsVehicles = currentPlan.vehicleLimit !== null && vehicleCount > currentPlan.vehicleLimit;
  const exceedsDrivers = currentPlan.driverLimit !== null && driverCount > currentPlan.driverLimit;

  if (exceedsContacts || exceedsVehicles || exceedsDrivers) {
    return "El estado actual supera los límites del plan Básico. Revisa tus datos antes de continuar";
  }

  return "";
}

export function PlanSetup() {
  const navigate = useNavigate();
  const plansRef = useRef<HTMLDivElement | null>(null);
  const continueButtonRef = useRef<HTMLButtonElement | null>(null);
  const [plans, setPlans] = useState<MotoSosPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<UserPlanState | null>(null);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<MotoSosPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRequestingBusinessInfo, setIsRequestingBusinessInfo] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [businessMessage, setBusinessMessage] = useState("");
  const [lastRefresh, setLastRefresh] = useState("");

  const session = getSession();
  const accountStatus = session?.accountStatus ?? "active";
  const limitWarning = getLimitWarning(currentPlan);
  const canContinue = Boolean((!currentPlan || currentPlan.status === "active") && !limitWarning);

  const loadPlans = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [plansResponse, currentPlanResponse] = await Promise.all([getAvailablePlans(), getCurrentPlan()]);

      if (!plansResponse.success || !plansResponse.data || !currentPlanResponse.success) {
        setErrorMessage(plansResponse.message || currentPlanResponse.message || "No pudimos cargar los planes");
        return;
      }

      setPlans(plansResponse.data);
      setCurrentPlan(currentPlanResponse.data);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPlans();
  }, []);

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await refreshPlanStatus();
      if (!response.success || !response.data) {
        setErrorMessage(response.message || "No pudimos actualizar el estado del plan");
        return;
      }

      setCurrentPlan(response.data);
      setLastRefresh(new Intl.DateTimeFormat("es-MX", { timeStyle: "short" }).format(new Date()));
      setSuccessMessage("El estado del plan está actualizado");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRequestBusinessInformation = async () => {
    setIsRequestingBusinessInfo(true);
    setBusinessMessage("");

    try {
      const response = await requestBusinessLicenseInformation();
      setBusinessMessage(response.message);
    } finally {
      setIsRequestingBusinessInfo(false);
    }
  };

  const handleContinueBasic = () => {
    setSuccessMessage("Plan Básico seleccionado. Usa Guardar y continuar para confirmar el paso.");
    window.setTimeout(() => continueButtonRef.current?.focus(), 0);
  };

  const handleSubmit = async () => {
    setSuccessMessage("");
    setErrorMessage("");

    if (!canContinue) {
      setErrorMessage(limitWarning || "Confirma que el plan Básico esté activo para continuar.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await confirmCurrentPlan("basico");

      if (!response.success || !response.data) {
        setErrorMessage(response.message);
        return;
      }

      updateSession({
        plan: response.data.planId,
        planStatus: response.data.status,
        licenseType: "individual",
        contactLimit: 1,
        vehicleLimit: 1,
        driverLimit: 1,
        planConfigured: true,
        currentSetupStep: response.data.nextStep,
      });
      setSuccessMessage(response.message);
      window.setTimeout(() => navigate("/configuracion/confirmacion"), 650);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const firstUpgradePlan = plans.find((plan) => plan.id !== "basico") ?? null;
  const modalPlan = selectedUpgradePlan;

  return (
    <SetupLayout activeStep="plan" rightPanelPlacement="hidden">
      <div className="plan-setup">
        <header className="plan-setup__header">
          <p>Configuración inicial</p>
          <h1>Plan y licencia</h1>
          <span>Elige el plan que mejor se adapte a ti. No perderás las funciones esenciales de seguridad.</span>
        </header>

        <div className="plan-setup__messages" aria-live="polite">
          {errorMessage ? <AlertMessage variant="error">{errorMessage}</AlertMessage> : null}
          {successMessage ? <AlertMessage variant="success">{successMessage}</AlertMessage> : null}
        </div>

        {isLoading ? (
          <section className="plan-setup__loading" aria-live="polite">
            Cargando planes...
          </section>
        ) : errorMessage && plans.length === 0 ? (
          <section className="plan-setup__empty" aria-live="assertive">
            <h2>No pudimos cargar los planes</h2>
            <Button onClick={loadPlans} type="button">
              Reintentar
            </Button>
          </section>
        ) : (
          <>
            {!currentPlan ? (
              <AlertMessage variant="warning">No se encontró un plan activo. Puedes confirmar Básico para continuar.</AlertMessage>
            ) : null}
            {limitWarning ? <PlanLimitWarning message={limitWarning} /> : null}

            <EssentialSecurityNotice />

            <section className="plan-setup__plans" aria-labelledby="plans-title" ref={plansRef}>
              <div>
                <p>Planes disponibles</p>
                <h2 id="plans-title">Compara beneficios y límites</h2>
              </div>
              <div className="plan-setup__pager">
                <PlanPagination currentPlanId={currentPlan?.currentPlan ?? "basico"} onUpgrade={setSelectedUpgradePlan} plans={plans} />
              </div>
            </section>

            <PlanDetailsAccordion
              accountStatus={accountStatus}
              activatedAt={currentPlan?.activatedAt ?? session?.planActivatedAt ?? null}
              currentPlan={currentPlan}
              isRefreshing={isRefreshing}
              lastRefresh={lastRefresh}
              onRefreshStatus={handleRefreshStatus}
              userName={session?.name ?? "Usuario MotoSOS"}
            />

            <PaymentInformationCard
              onContinueBasic={handleContinueBasic}
              onOpenUpgrade={() => (firstUpgradePlan ? setSelectedUpgradePlan(firstUpgradePlan) : undefined)}
            />

            <BusinessLicenseNotice
              isLoading={isRequestingBusinessInfo}
              message={businessMessage}
              onRequestInformation={handleRequestBusinessInformation}
            />

            <section className="plan-setup__actions" aria-label="Acciones de plan">
              <Button disabled={isSubmitting} onClick={() => navigate("/configuracion/dispositivos")} type="button" variant="secondary">
                <ArrowLeft aria-hidden="true" size={16} />
                Anterior
              </Button>
              <Button
                disabled={isSubmitting}
                isLoading={isSubmitting}
                loadingText="Confirmando plan..."
                onClick={handleSubmit}
                ref={continueButtonRef}
                type="button"
              >
                Guardar y continuar
                <ArrowRight aria-hidden="true" size={16} />
              </Button>
            </section>
          </>
        )}
      </div>

      {modalPlan ? <UpgradeInAppModal onClose={() => setSelectedUpgradePlan(null)} plan={modalPlan} /> : null}
    </SetupLayout>
  );
}
