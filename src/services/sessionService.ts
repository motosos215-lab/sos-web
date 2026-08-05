import type { LicenseType, PlanId, PlanStatus } from "../types/plan";

export type UserRole = "conductor" | "monitor" | "administrador";
export type SimulatedPlan = PlanId;
export type AccountStatus = "active" | "pending" | "inactive";
export type RegistrationStatus = "pending" | "completed";

export type SetupStepKey =
  | "perfil"
  | "motocicleta"
  | "contactos"
  | "dispositivos"
  | "plan"
  | "confirmacion"
  | "completed";

export interface SimulatedSession {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  accountStatus?: AccountStatus;
  setupCompleted: boolean;
  registrationStatus: RegistrationStatus;
  setupCompletedAt: string;
  currentSetupStep: SetupStepKey;
  plan: SimulatedPlan;
  planStatus: PlanStatus;
  licenseType: LicenseType;
  contactLimit: number;
  vehicleLimit: number;
  driverLimit: number;
  planConfigured: boolean;
  planActivatedAt: string;
  vehicleRegistered: boolean;
  vehicleId: string | null;
  emergencyContactConfigured: boolean;
  emergencyContactId: string | null;
  devicesConfigured: boolean;
  mobileDeviceLinked: boolean;
  smartwatchLinked: boolean;
  mobileDeviceId: string | null;
  smartwatchDeviceId: string | null;
}

const LEGACY_SESSION_KEY = "motosos.simulatedSession";
const CURRENT_USER_KEY = "motosos.currentUserId";

function setupKeyFor(userId: string): string {
  return `motosos.setup.${userId}`;
}

export function getActiveUserId(): string | null {
  const currentUserId = window.sessionStorage.getItem(CURRENT_USER_KEY);

  return typeof currentUserId === "string" && currentUserId.length > 0 ? currentUserId : null;
}

function isSetupStepKey(value: unknown): value is SetupStepKey {
  return (
    value === "perfil" ||
    value === "motocicleta" ||
    value === "contactos" ||
    value === "dispositivos" ||
    value === "plan" ||
    value === "confirmacion" ||
    value === "completed"
  );
}

function isRegistrationStatus(value: unknown): value is RegistrationStatus {
  return value === "pending" || value === "completed";
}

function isUserRole(value: unknown): value is UserRole {
  return value === "conductor" || value === "monitor" || value === "administrador";
}

function isPlanId(value: unknown): value is PlanId {
  return value === "basico" || value === "plus" || value === "familiar_pro";
}

function isPlanStatus(value: unknown): value is PlanStatus {
  return value === "active" || value === "available" || value === "pending" || value === "expired" || value === "cancelled";
}

function isLicenseType(value: unknown): value is LicenseType {
  return value === "individual" || value === "family" || value === "business";
}

function isAccountStatus(value: unknown): value is AccountStatus {
  return value === "active" || value === "pending" || value === "inactive";
}

function parseSession(value: string): SimulatedSession | null {
  try {
    const parsed = JSON.parse(value) as Partial<SimulatedSession>;

    if (
      typeof parsed.userId !== "string" ||
      typeof parsed.name !== "string" ||
      typeof parsed.email !== "string" ||
      !isUserRole(parsed.role) ||
      typeof parsed.setupCompleted !== "boolean" ||
      !isSetupStepKey(parsed.currentSetupStep)
    ) {
      return null;
    }

    return {
      userId: parsed.userId,
      name: parsed.name,
      email: parsed.email,
      role: parsed.role,
      accountStatus: isAccountStatus(parsed.accountStatus) ? parsed.accountStatus : parsed.setupCompleted ? "active" : "pending",
      setupCompleted: parsed.setupCompleted,
      registrationStatus: isRegistrationStatus(parsed.registrationStatus)
        ? parsed.registrationStatus
        : parsed.setupCompleted
          ? "completed"
          : "pending",
      setupCompletedAt:
        typeof parsed.setupCompletedAt === "string" && parsed.setupCompletedAt.length > 0
          ? parsed.setupCompletedAt
          : parsed.setupCompleted
            ? new Date().toISOString()
            : "",
      currentSetupStep: parsed.currentSetupStep,
      plan: isPlanId(parsed.plan) ? parsed.plan : "basico",
      planStatus: isPlanStatus(parsed.planStatus) ? parsed.planStatus : "active",
      licenseType: isLicenseType(parsed.licenseType) ? parsed.licenseType : "individual",
      contactLimit: typeof parsed.contactLimit === "number" ? parsed.contactLimit : 1,
      vehicleLimit: typeof parsed.vehicleLimit === "number" ? parsed.vehicleLimit : 1,
      driverLimit: typeof parsed.driverLimit === "number" ? parsed.driverLimit : 1,
      planConfigured: typeof parsed.planConfigured === "boolean" ? parsed.planConfigured : false,
      planActivatedAt: typeof parsed.planActivatedAt === "string" ? parsed.planActivatedAt : new Date().toISOString(),
      vehicleRegistered: typeof parsed.vehicleRegistered === "boolean" ? parsed.vehicleRegistered : false,
      vehicleId: typeof parsed.vehicleId === "string" ? parsed.vehicleId : null,
      emergencyContactConfigured:
        typeof parsed.emergencyContactConfigured === "boolean" ? parsed.emergencyContactConfigured : false,
      emergencyContactId: typeof parsed.emergencyContactId === "string" ? parsed.emergencyContactId : null,
      devicesConfigured: typeof parsed.devicesConfigured === "boolean" ? parsed.devicesConfigured : false,
      mobileDeviceLinked: typeof parsed.mobileDeviceLinked === "boolean" ? parsed.mobileDeviceLinked : false,
      smartwatchLinked: typeof parsed.smartwatchLinked === "boolean" ? parsed.smartwatchLinked : false,
      mobileDeviceId: typeof parsed.mobileDeviceId === "string" ? parsed.mobileDeviceId : null,
      smartwatchDeviceId: typeof parsed.smartwatchDeviceId === "string" ? parsed.smartwatchDeviceId : null,
    };
  } catch {
    return null;
  }
}

export function saveSession(session: SimulatedSession) {
  window.sessionStorage.setItem(setupKeyFor(session.userId), JSON.stringify(session));
  window.sessionStorage.setItem(CURRENT_USER_KEY, session.userId);
  window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
}

function migrateLegacySession(): SimulatedSession | null {
  const rawLegacy = window.sessionStorage.getItem(LEGACY_SESSION_KEY);

  if (!rawLegacy) {
    return null;
  }

  const legacySession = parseSession(rawLegacy);

  if (legacySession) {
    saveSession(legacySession);
  } else {
    window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
  }

  return legacySession;
}

export function getSession(): SimulatedSession | null {
  const currentUserId = getActiveUserId();

  if (!currentUserId) {
    return migrateLegacySession();
  }

  const storedSession = window.sessionStorage.getItem(setupKeyFor(currentUserId));

  if (!storedSession) {
    return migrateLegacySession();
  }

  return parseSession(storedSession);
}

export function getSessionForUser(userId: string): SimulatedSession | null {
  if (!userId) {
    return null;
  }

  const storedSession = window.sessionStorage.getItem(setupKeyFor(userId));

  return storedSession ? parseSession(storedSession) : null;
}

export function updateSession(updates: Partial<SimulatedSession>): SimulatedSession | null {
  const currentSession = getSession();

  if (!currentSession) {
    return null;
  }

  const nextSession = { ...currentSession, ...updates };
  saveSession(nextSession);
  return nextSession;
}

export function clearSession() {
  const currentUserId = getActiveUserId();

  if (currentUserId) {
    window.sessionStorage.removeItem(CURRENT_USER_KEY);
  }

  window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
}
