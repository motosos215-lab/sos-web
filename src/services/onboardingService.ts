import type { ApiResponse } from "../types/auth";
import type { ConfirmOnboardingResult, OnboardingStatus, OnboardingSummary, OnboardingSummaryModule } from "../types/onboarding";
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

function readNumber(source: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function normalizeStep(value: string | undefined): SetupStepKey | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

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

function normalizeSteps(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter(isRecord).map((step) => ({
    key: readString(step, ["key"]),
    order: readNumber(step, ["order"]),
    label: readString(step, ["label", "title"]),
    status: readString(step, ["status"]),
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

  const source = isRecord(value.summary) ? value.summary : value;

  return {
    isCompleted: readBoolean(source, ["isCompleted", "completed", "setupCompleted", "onboardingCompleted"]),
    isValid: readBoolean(source, ["isValid", "valid"]),
    canConfirm: readBoolean(source, ["canConfirm"]),
    isConfirmed: readBoolean(source, ["isConfirmed", "confirmed"]),
    isOperational: readBoolean(source, ["isOperational", "operational"]),
    completedSteps: readNumber(source, ["completedSteps"]),
    progressPercentage: readNumber(source, ["progressPercentage"]),
    currentStep: normalizeStep(readString(source, ["currentStep", "step", "nextStep"])),
    modules: normalizeModules(source.modules),
    blockingIssues: readStringArray(source.blockingIssues),
    warnings: readStringArray(source.warnings),
    user: isRecord(source.user)
      ? {
          id: readString(source.user, ["id"]),
          fullName: readString(source.user, ["fullName", "name"]),
          email: readString(source.user, ["email"]),
          phoneNumber: readString(source.user, ["phoneNumber", "phone"]),
          role: readString(source.user, ["role"]),
        }
      : undefined,
    profile: isRecord(source.profile)
      ? {
          fullName: readString(source.profile, ["fullName", "name"]),
          phoneNumber: readString(source.profile, ["phoneNumber", "phone"]),
          primaryCity: readString(source.profile, ["primaryCity", "city"]),
          addressOrZone: readString(source.profile, ["addressOrZone", "address"]),
        }
      : undefined,
    vehicle: isRecord(source.vehicle)
      ? {
          id: readString(source.vehicle, ["id"]),
          vehicleType: readString(source.vehicle, ["vehicleType", "type"]),
          brand: readString(source.vehicle, ["brand"]),
          model: readString(source.vehicle, ["model"]),
          year: readNumber(source.vehicle, ["year"]),
          alias: readString(source.vehicle, ["alias"]),
        }
      : undefined,
    emergencyContact: isRecord(source.emergencyContact)
      ? {
          id: readString(source.emergencyContact, ["id"]),
          fullName: readString(source.emergencyContact, ["fullName", "name"]),
          phoneNumber: readString(source.emergencyContact, ["phoneNumber", "phone"]),
          relationship: readString(source.emergencyContact, ["relationship"]),
          invitationStatus: readString(source.emergencyContact, ["invitationStatus", "status"]),
        }
      : undefined,
    mobileDevice: normalizeDevice(source.mobileDevice),
    smartwatch: normalizeDevice(source.smartwatch),
    subscription: isRecord(source.subscription)
      ? {
          id: readString(source.subscription, ["id"]),
          planTier: readString(source.subscription, ["planTier", "plan"]),
          status: readString(source.subscription, ["status"]),
          source: readString(source.subscription, ["source"]),
        }
      : undefined,
    steps: normalizeSteps(source.steps),
  };
}

function normalizeDevice(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    id: readString(value, ["id"]),
    deviceType: readString(value, ["deviceType", "type"]),
    deviceName: readString(value, ["deviceName", "name"]),
    platform: readString(value, ["platform"]),
    linkStatus: readString(value, ["linkStatus"]),
    connectionStatus: readString(value, ["connectionStatus"]),
    batteryLevel: readNumber(value, ["batteryLevel"]),
  };
}

function normalizeConfirmResult(value: unknown): ConfirmOnboardingResult {
  if (!isRecord(value)) {
    throw new ApiRequestError("invalid_response", "No pudimos confirmar que la cuenta quedara activada", null);
  }

  const source = isRecord(value.onboarding) ? value.onboarding : value;
  const currentStep = normalizeStep(readString(source, ["currentStep", "step", "nextStep"]));

  const result = {
    isCompleted:
      readBoolean(source, [
        "isCompleted",
        "completed",
        "setupCompleted",
        "onboardingCompleted",
        "isConfirmed",
        "confirmed",
        "isOperational",
      ]) ?? (currentStep === "completed" ? true : undefined),
    completedAtUtc: readString(source, ["completedAtUtc", "completedAt"]),
  };

  if (result.isCompleted !== true && !result.completedAtUtc) {
    throw new ApiRequestError("invalid_response", "No pudimos confirmar que la cuenta quedara activada", null);
  }

  return result;
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
