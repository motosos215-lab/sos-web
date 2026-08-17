import type {
  BusinessLicenseRequestState,
  LicenseType,
  MotoSosPlan,
  PlanConfirmationState,
  PlanId,
  PlanServiceResponse,
  PlanStatus,
  UserPlanState,
} from "../types/plan";
import type { ApiResponse } from "../types/auth";
import { api, unwrap } from "./api";
import { getSession } from "./sessionService";
import { getApiErrorMessage } from "../utils/apiErrors";

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

function getActivatedAt() {
  return getSession()?.planActivatedAt ?? nowIso;
}

type PlanApiRecord = Record<string, unknown>;

function normalizePlanId(value: unknown): PlanId {
  const normalized =
    typeof value === "string"
      ? value
          .trim()
          .toLowerCase()
          .replace(/[\s-]+/g, "_")
      : "";

  if (normalized === "plus") {
    return "plus";
  }

  if (normalized === "family" || normalized === "familiar" || normalized === "familiar_pro" || normalized === "pro") {
    return "familiar_pro";
  }

  return "basico";
}

function normalizePlanStatus(value: unknown, fallback: PlanStatus): PlanStatus {
  switch (typeof value === "string" ? value.toLowerCase() : "") {
    case "active":
    case "activo":
      return "active";
    case "pending":
      return "pending";
    case "expired":
      return "expired";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "available":
      return "available";
    default:
      return fallback;
  }
}

function normalizeLicenseType(value: unknown, fallback: LicenseType): LicenseType {
  switch (typeof value === "string" ? value.toLowerCase() : "") {
    case "family":
      return "family";
    case "business":
      return "business";
    case "individual":
      return "individual";
    default:
      return fallback;
  }
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toPlan(record: PlanApiRecord, fallback?: MotoSosPlan): MotoSosPlan {
  const id = normalizePlanId(record.id ?? record.tier ?? record.planTier ?? fallback?.id);
  const limits = record.limits && typeof record.limits === "object" ? (record.limits as Record<string, unknown>) : {};
  const benefits = Array.isArray(record.benefits) ? record.benefits.filter((item): item is string => typeof item === "string") : [];

  return {
    id,
    name:
      typeof record.name === "string"
        ? record.name
        : (fallback?.name ?? (id === "basico" ? "Básico" : id === "plus" ? "Plus" : "Familiar / Pro")),
    description: typeof record.description === "string" ? record.description : (fallback?.description ?? "Protección MotoSOS"),
    status: normalizePlanStatus(record.status, fallback?.status ?? (id === "basico" ? "active" : "available")),
    licenseType: normalizeLicenseType(record.licenseType, fallback?.licenseType ?? (id === "familiar_pro" ? "family" : "individual")),
    features:
      benefits.length > 0 ? benefits.map((label, index) => ({ id: `${id}-${index}`, label, included: true })) : (fallback?.features ?? []),
    upgradeAvailableInApp:
      typeof record.isSelectableInWeb === "boolean" ? !record.isSelectableInWeb : (fallback?.upgradeAvailableInApp ?? id !== "basico"),
    contactLimit:
      readNumber(record.contactLimit) ?? readNumber(limits.maxEmergencyContacts) ?? fallback?.contactLimit ?? (id === "basico" ? 1 : null),
    vehicleLimit:
      readNumber(record.vehicleLimit) ?? readNumber(limits.maxVehicles) ?? fallback?.vehicleLimit ?? (id === "basico" ? 1 : null),
    driverLimit: readNumber(record.driverLimit) ?? fallback?.driverLimit ?? (id === "familiar_pro" ? null : 1),
  };
}

function readPlanRecords(value: unknown): PlanApiRecord[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is PlanApiRecord => Boolean(item) && typeof item === "object");
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const source = value as Record<string, unknown>;
  const candidates = [source.plans, source.catalog, source.items];
  const match = candidates.find(Array.isArray);

  return Array.isArray(match) ? match.filter((item): item is PlanApiRecord => Boolean(item) && typeof item === "object") : [];
}

function toUserPlanState(value: unknown): UserPlanState {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const subscription =
    source.subscription && typeof source.subscription === "object" ? (source.subscription as Record<string, unknown>) : null;
  const defaultPlan = source.defaultPlan && typeof source.defaultPlan === "object" ? (source.defaultPlan as Record<string, unknown>) : null;
  const planTier = subscription?.planTier ?? subscription?.tier ?? defaultPlan?.tier ?? "Basic";
  const limits = defaultPlan?.limits && typeof defaultPlan.limits === "object" ? (defaultPlan.limits as Record<string, unknown>) : {};

  return {
    currentPlan: normalizePlanId(planTier),
    status: subscription ? normalizePlanStatus(subscription.status, "active") : "active",
    activatedAt: typeof subscription?.startedAtUtc === "string" ? subscription.startedAtUtc : getActivatedAt(),
    expiresAt: typeof subscription?.expiresAtUtc === "string" ? subscription.expiresAtUtc : null,
    contactLimit: readNumber(limits.maxEmergencyContacts) ?? 1,
    vehicleLimit: readNumber(limits.maxVehicles) ?? 1,
    driverLimit: 1,
    licenseType: "individual",
  };
}

export async function getAvailablePlans(): Promise<PlanServiceResponse<MotoSosPlan[]>> {
  try {
    const response = await api.get<ApiResponse<unknown>>("/api/v1/plans");
    const records = readPlanRecords(unwrap<unknown>(response));
    const plans =
      records.length > 0
        ? availablePlans.map((fallback) =>
            toPlan(records.find((record) => normalizePlanId(record.id ?? record.tier ?? record.planTier) === fallback.id) ?? {}, fallback),
          )
        : availablePlans;

    return {
      success: true,
      message: "Planes obtenidos correctamente",
      data: plans,
    };
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error), data: null };
  }
}

export async function getCurrentPlan(): Promise<PlanServiceResponse<UserPlanState>> {
  try {
    const response = await api.get<ApiResponse<unknown>>("/api/v1/subscriptions/me");

    return {
      success: true,
      message: "Plan actual obtenido correctamente",
      data: toUserPlanState(unwrap<unknown>(response)),
    };
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error), data: null };
  }
}

export async function confirmCurrentPlan(planId: PlanId): Promise<PlanServiceResponse<PlanConfirmationState>> {
  if (planId !== "basico") {
    return {
      success: false,
      message: "Las mejoras de planes individuales deben completarse desde la app MotoSOS",
      data: null,
    };
  }

  try {
    const response = await api.post<ApiResponse<unknown>>("/api/v1/subscriptions/select-basic", {});
    const data = unwrap<unknown>(response);
    const current = toUserPlanState(data);

    return {
      success: true,
      message: "Plan Básico confirmado correctamente",
      data: {
        planId: current.currentPlan,
        status: current.status,
        completed: true,
        nextStep: "confirmacion",
      },
    };
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error), data: null };
  }
}

export async function refreshPlanStatus(): Promise<PlanServiceResponse<UserPlanState>> {
  return getCurrentPlan();
}

export async function requestBusinessLicenseInformation(): Promise<PlanServiceResponse<BusinessLicenseRequestState>> {
  return {
    success: true,
    message: "Para licencias empresariales, contacta a soporte MotoSOS y te ayudaremos con la solicitud",
    data: {
      requested: true,
      message: "Para licencias empresariales, contacta a soporte MotoSOS y te ayudaremos con la solicitud",
    },
  };
}
