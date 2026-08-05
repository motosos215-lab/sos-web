import type {
  BusinessLicenseRequestState,
  MotoSosPlan,
  PlanConfirmationState,
  PlanId,
  PlanServiceResponse,
  UserPlanState,
} from "../types/plan";
import { getSession } from "./sessionService";

const nowIso = new Date().toISOString();

export const availablePlans: MotoSosPlan[] = [
  {
    id: "basico",
    name: "Básico",
    description: "Plan incluido con tu cuenta",
    status: "active",
    licenseType: "individual",
    contactLimit: 1,
    vehicleLimit: 1,
    driverLimit: 1,
    upgradeAvailableInApp: false,
    features: [
      { id: "emergency-contact-1", label: "1 contacto de emergencia", included: true, limit: 1 },
      { id: "mobile-app", label: "App móvil", included: true },
      { id: "smartwatch", label: "Smartwatch", included: true },
      { id: "monitored-trip", label: "Viaje monitoreado", included: true },
      { id: "basic-crash-detection", label: "Detección de accidente", included: true },
      { id: "sos-button", label: "Botón SOS", included: true },
      { id: "emergency-location", label: "Ubicación en emergencia", included: true },
      { id: "basic-history", label: "Historial básico", included: true },
    ],
  },
  {
    id: "plus",
    name: "Plus",
    description: "Más protección y control para tu día a día",
    status: "available",
    licenseType: "individual",
    contactLimit: 5,
    vehicleLimit: 2,
    driverLimit: 1,
    upgradeAvailableInApp: true,
    features: [
      { id: "basic-included", label: "Incluye todos los beneficios del plan Básico", included: true },
      { id: "emergency-contacts-5", label: "Hasta 5 contactos de emergencia", included: true, limit: 5 },
      { id: "automatic-escalation", label: "Escalamiento automático", included: true },
      { id: "notification-channels", label: "Más canales de notificación", included: true },
      { id: "extended-history", label: "Historial extendido", included: true },
      { id: "more-than-one-vehicle", label: "Más de un vehículo", included: true, limit: 2 },
      { id: "basic-reports", label: "Reportes básicos", included: true },
    ],
  },
  {
    id: "familiar_pro",
    name: "Familiar / Pro",
    description: "Para familias y grupos que viajan juntos",
    status: "available",
    licenseType: "family",
    contactLimit: null,
    vehicleLimit: null,
    driverLimit: null,
    upgradeAvailableInApp: true,
    features: [
      { id: "previous-plans", label: "Incluye beneficios de planes anteriores", included: true },
      { id: "multiple-drivers", label: "Múltiples conductores", included: true, limit: null },
      { id: "multiple-vehicles", label: "Varios vehículos", included: true, limit: null },
      { id: "family-panel", label: "Panel familiar", included: true },
      { id: "advanced-reports", label: "Reportes avanzados", included: true },
    ],
  },
];

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function getActivatedAt() {
  return getSession()?.planActivatedAt ?? nowIso;
}

export async function getAvailablePlans(): Promise<PlanServiceResponse<MotoSosPlan[]>> {
  await wait(350);

  return {
    success: true,
    message: "Planes obtenidos correctamente",
    data: availablePlans,
  };
}

export async function getCurrentPlan(): Promise<PlanServiceResponse<UserPlanState>> {
  await wait(500);
  const session = getSession();

  return {
    success: true,
    message: "Plan actual obtenido correctamente",
    data: {
      currentPlan: session?.plan ?? "basico",
      status: session?.planStatus ?? "active",
      contactLimit: session?.contactLimit ?? 1,
      vehicleLimit: session?.vehicleLimit ?? 1,
      driverLimit: session?.driverLimit ?? 1,
      licenseType: session?.licenseType ?? "individual",
      activatedAt: getActivatedAt(),
      expiresAt: null,
    },
  };
}

export async function confirmCurrentPlan(planId: PlanId): Promise<PlanServiceResponse<PlanConfirmationState>> {
  if (planId !== "basico") {
    return {
      success: false,
      message: "Las mejoras de planes individuales deben completarse desde la app MotoSOS",
      data: null,
    };
  }

  await wait(700);

  return {
    success: true,
    message: "Plan Básico confirmado correctamente",
    data: {
      planId: "basico",
      status: "active",
      completed: true,
      nextStep: "confirmacion",
    },
  };
}

export async function refreshPlanStatus(): Promise<PlanServiceResponse<UserPlanState>> {
  await wait(500);
  return getCurrentPlan();
}

export async function requestBusinessLicenseInformation(): Promise<PlanServiceResponse<BusinessLicenseRequestState>> {
  await wait(400);

  return {
    success: true,
    message: "La solicitud empresarial estará disponible en una etapa posterior",
    data: {
      requested: true,
      message: "La solicitud empresarial estará disponible en una etapa posterior",
    },
  };
}
