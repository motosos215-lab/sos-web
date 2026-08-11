import type { ApiResponse } from "../types/auth";
import type {
  ConfirmOnboardingResult,
  OnboardingStatus,
  OnboardingSummary,
  OnboardingSummaryModule,
} from "../types/onboarding";
import { ApiRequestError, api, unwrap } from "./api";
import type { SetupStepKey, SimulatedSession } from "./sessionService";

const STEP_ROUTES: Record<SetupStepKey, string> = {
  perfil: "/configuracion/perfil",
  motocicleta: "/configuracion/motocicleta",
  contactos: "/configuracion/contactos",
  dispositivos: "/configuracion/dispositivos",
  plan: "/configuracion/plan",
  confirmacion: "/configuracion/confirmacion",
  completed: "/dashboard/resumen",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function readBoolean(source: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "boolean") {
      return value;
    }
  }

  return undefined;
}

function readString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function normalizeStep(value: string | undefined): SetupStepKey | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, "");

  switch (normalized) {
    case "profile":
    case "perfil":
      return "perfil";
    case "vehicle":
    case "vehiculo":
    case "motocicleta":
    case "motorcycle":
      return "motocicleta";
    case "emergencycontacts":
    case "contacts":
    case "contactos":
      return "contactos";
    case "devices":
    case "dispositivos":
      return "dispositivos";
    case "plan":
    case "plans":
    case "planes":
      return "plan";
    case "confirmation":
    case "confirmacion":
    case "confirm":
      return "confirmacion";
    case "completed":
    case "complete":
    case "done":
      return "completed";
    default:
      return undefined;
  }
}

function normalizeModules(value: unknown): OnboardingSummaryModule[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter(isRecord).map((module) => ({
    key: readString(module, ["key", "name", "code"]),
    title: readString(module, ["title", "label", "name"]),
    status: readString(module, ["status", "state"]),
    blockingMessage: readString(module, ["blockingMessage", "errorMessage"]),
    warningMessage: readString(module, ["warningMessage"]),
  }));
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function normalizeOnboardingStatus(value: unknown): OnboardingStatus {
  if (!isRecord(value)) {
    throw new ApiRequestError("invalid_response", "Recibimos una respuesta inesperada del servicio", null);
  }

  const currentStep = normalizeStep(readString(value, ["currentStep", "step", "nextStep"]));
  const isCompleted = readBoolean(value, ["isCompleted", "completed", "setupCompleted", "onboardingCompleted"]);
  const isConfirmed = readBoolean(value, ["isConfirmed", "confirmed", "onboardingConfirmed"]);

  return {
    isCompleted,
    isConfirmed,
    currentStep: isCompleted === true ? "completed" : currentStep,
    profileCompleted: readBoolean(value, ["profileCompleted", "isProfileCompleted"]),
    vehicleCompleted: readBoolean(value, ["vehicleCompleted", "isVehicleCompleted"]),
    emergencyContactsCompleted: readBoolean(value, ["emergencyContactsCompleted", "contactsCompleted", "isEmergencyContactsCompleted"]),
    devicesCompleted: readBoolean(value, ["devicesCompleted", "isDevicesCompleted"]),
    planCompleted: readBoolean(value, ["planCompleted", "isPlanCompleted"]),
  };
}

function normalizeOnboardingSummary(value: unknown): OnboardingSummary {
  if (!isRecord(value)) {
    throw new ApiRequestError("invalid_response", "Recibimos una respuesta inesperada del servicio", null);
  }

  return {
    isCompleted: readBoolean(value, ["isCompleted", "completed", "setupCompleted", "onboardingCompleted"]),
    isValid: readBoolean(value, ["isValid", "valid"]),
    currentStep: normalizeStep(readString(value, ["currentStep", "step", "nextStep"])),
    modules: normalizeModules(value.modules),
    blockingIssues: readStringArray(value.blockingIssues),
    warnings: readStringArray(value.warnings),
  };
}

function normalizeConfirmResult(value: unknown): ConfirmOnboardingResult {
  if (!isRecord(value)) {
    return {};
  }

  return {
    isCompleted: readBoolean(value, ["isCompleted", "completed", "setupCompleted", "onboardingCompleted"]),
    completedAtUtc: readString(value, ["completedAtUtc", "completedAt"]),
  };
}

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const response = await api.get<ApiResponse<unknown>>("/api/v1/onboarding/status");
  return normalizeOnboardingStatus(unwrap<unknown>(response));
}

export async function getOnboardingSummary(): Promise<OnboardingSummary> {
  const response = await api.get<ApiResponse<unknown>>("/api/v1/onboarding/summary");
  return normalizeOnboardingSummary(unwrap<unknown>(response));
}

export async function confirmOnboarding(): Promise<ConfirmOnboardingResult> {
  const response = await api.post<ApiResponse<unknown>>("/api/v1/onboarding/confirm");
  return normalizeConfirmResult(unwrap<unknown>(response));
}

export function resolveOnboardingRoute(
  status: OnboardingStatus,
  fallbackSession?: Pick<SimulatedSession, "currentSetupStep"> | null,
): string {
  if (status.isCompleted === true || status.isConfirmed === true || status.currentStep === "completed") {
    return "/dashboard/resumen";
  }

  if (status.profileCompleted === false) {
    return STEP_ROUTES.perfil;
  }

  if (status.profileCompleted === true && status.vehicleCompleted === false) {
    return STEP_ROUTES.motocicleta;
  }

  if (status.vehicleCompleted === true && status.emergencyContactsCompleted === false) {
    return STEP_ROUTES.contactos;
  }

  if (status.emergencyContactsCompleted === true && status.devicesCompleted === false) {
    return STEP_ROUTES.dispositivos;
  }

  if (status.devicesCompleted === true && status.planCompleted === false) {
    return STEP_ROUTES.plan;
  }

  if (
    status.profileCompleted === true &&
    status.vehicleCompleted === true &&
    status.emergencyContactsCompleted === true &&
    status.devicesCompleted === true &&
    status.planCompleted === true
  ) {
    return STEP_ROUTES.confirmacion;
  }

  if (status.currentStep) {
    return STEP_ROUTES[status.currentStep];
  }

  if (fallbackSession?.currentSetupStep) {
    return STEP_ROUTES[fallbackSession.currentSetupStep];
  }

  return STEP_ROUTES.perfil;
}

export function getSetupStepFromOnboardingStatus(status: OnboardingStatus, fallback?: SetupStepKey): SetupStepKey {
  const route = resolveOnboardingRoute(status, fallback ? { currentSetupStep: fallback } : null);
  const match = Object.entries(STEP_ROUTES).find(([, path]) => path === route);

  return (match?.[0] as SetupStepKey | undefined) ?? fallback ?? "perfil";
}
