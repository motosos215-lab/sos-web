import type {
  CompleteSetupResponse,
  SetupCompletionValidation,
  SetupSummaryDetail,
  SetupSummaryKey,
  SetupSummaryModule,
  SetupSummaryStatus,
} from "../types/setupConfirmation";
import type { InvitationStatus } from "../types/contact";
import type { MobileDevice, SmartwatchDevice } from "../types/device";
import type { OnboardingSummary, OnboardingSummaryStep } from "../types/onboarding";
import type { PlanId } from "../types/plan";
import { formatRelativeDate } from "../utils/dateFormat";
import { maskEmail, maskLicensePlate, maskPhone, safeDisplayValue } from "../utils/privacy";
import { getDriverProfileDraft } from "./profileDraftService";
import { getSession, updateSession, type SimulatedSession } from "./sessionService";
import { getStoredEmergencyContacts } from "./contactStorageService";
import { getStoredDevicesState } from "./deviceStorageService";
import { getVehicleDraft } from "./vehicleDraftService";
import { confirmOnboarding, getOnboardingSummary } from "./onboardingService";
import { getApiErrorMessage } from "../utils/apiErrors";

const PLAN_NAMES: Record<PlanId, string> = {
  basico: "Básico",
  plus: "Plus",
  familiar_pro: "Familiar / Pro",
};

const LICENSE_LABELS: Record<string, string> = {
  individual: "Individual",
  family: "Familiar",
  business: "Empresarial",
};

const INVITATION_LABELS: Record<InvitationStatus, string> = {
  pending: "Invitación pendiente",
  invited: "Invitado",
  linked: "Vinculado",
  rejected: "Rechazado",
  expired: "Expirado",
  revoked: "Revocado",
};

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  motocicleta: "Motocicleta",
  motoneta: "Motoneta",
};

const SMARTWATCH_WARNING = "No tienes un smartwatch vinculado. Puedes agregarlo después desde la app MotoSOS";
const CONTACT_LINK_WARNING = "Tu contacto todavía debe aceptar la invitación desde la aplicación móvil";
const DOCUMENTS_WARNING = "Puedes agregar documentos posteriormente desde la configuración de tu cuenta";
const PLAN_UPGRADE_WARNING = "Puedes mejorar tu plan posteriormente desde la aplicación móvil";

function getStepStatus(summary: OnboardingSummary, key: string): string | undefined {
  return summary.steps?.find((step: OnboardingSummaryStep) => step.key?.toLowerCase() === key.toLowerCase())?.status?.toLowerCase();
}

function isStepComplete(summary: OnboardingSummary, key: string): boolean {
  return getStepStatus(summary, key) === "completed";
}

function mapInvitationStatus(value: string | undefined): InvitationStatus | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
  if (["pending", "invited", "linked", "rejected", "expired", "revoked"].includes(normalized)) {
    return normalized as InvitationStatus;
  }

  return null;
}

function mapPlanId(value: string | undefined): PlanId {
  const normalized = value?.toLowerCase().replace(/[-\s]+/g, "_");

  if (normalized === "plus" || normalized === "familiar_pro") {
    return normalized;
  }

  return "basico";
}

function formatBackendVehicleType(value: string | undefined): string {
  if (!value) {
    return "No disponible";
  }

  const normalized = value.toLowerCase();
  return VEHICLE_TYPE_LABELS[normalized] ?? value;
}

function createModule(
  key: SetupSummaryKey,
  title: string,
  description: string,
  editPath: string,
  status: SetupSummaryStatus,
  details: SetupSummaryDetail[],
  blockingMessage?: string,
  warningMessage?: string,
): SetupSummaryModule {
  return {
    key,
    title,
    description,
    editPath,
    required: true,
    status,
    details,
    ...(blockingMessage ? { blockingMessage } : {}),
    ...(warningMessage ? { warningMessage } : {}),
  };
}

function buildCuentaModule(session: SimulatedSession): SetupSummaryModule {
  const hasValidSession = session.userId.length > 0 && session.name.length > 0 && session.email.length > 0 && session.role === "conductor";

  const blockingMessage = hasValidSession
    ? undefined
    : session.role !== "conductor"
      ? "Tu sesión de conductor no está autenticada correctamente"
      : "Faltan datos de tu cuenta. Verifica tu sesión e inicia sesión de nuevo";

  return createModule(
    "cuenta",
    "Cuenta",
    "Tu cuenta MotoSOS verificada",
    "",
    hasValidSession ? "complete" : "incomplete",
    [
      { label: "Nombre", value: safeDisplayValue(session.name) },
      { label: "Correo", value: maskEmail(session.email) },
      { label: "Rol", value: "Conductor" },
      { label: "Estado", value: "Cuenta verificada" },
    ],
    blockingMessage,
  );
}

function buildPerfilModule(session: SimulatedSession): SetupSummaryModule {
  const profileDraft = getDriverProfileDraft();
  const profileCompleted = session.onboardingStatusSnapshot?.profileCompleted === true;
  const fullName = profileDraft?.fullName ?? session.name;
  const phone = profileDraft?.phone ?? "";
  const email = profileDraft?.email ?? session.email;
  const city = profileDraft?.city ?? "";
  const bloodType = profileDraft?.bloodType ?? "";

  const hasBasicInfo = profileCompleted || (fullName.length > 0 && phone.length > 0 && email.length > 0);

  return createModule(
    "perfil",
    "Perfil",
    "Información personal básica",
    "/configuracion/perfil",
    hasBasicInfo ? "complete" : "incomplete",
    [
      { label: "Nombre", value: safeDisplayValue(fullName) },
      { label: "Correo", value: maskEmail(email) },
      { label: "Teléfono", value: phone ? maskPhone(phone) : profileCompleted ? "Guardado en MotoSOS" : "No disponible" },
      { label: "Ciudad", value: safeDisplayValue(city) },
      ...(bloodType ? [{ label: "Tipo de sangre", value: bloodType }] : []),
    ],
    hasBasicInfo ? undefined : "Completa la información básica de tu perfil",
    bloodType.length > 0 ? undefined : "Puedes completar tu información médica opcional desde tu perfil",
  );
}

function buildVehiculoModule(session: SimulatedSession): SetupSummaryModule {
  const vehicleDraft = getVehicleDraft();
  const registered = session.vehicleRegistered && Boolean(session.vehicleId);

  const brand = vehicleDraft?.brand || vehicleDraft?.customBrand || "";
  const city = vehicleDraft?.circulationCity || vehicleDraft?.customCirculationCity || "";
  const plate = vehicleDraft?.licensePlate?.trim() ?? "";

  return createModule(
    "motocicleta",
    "Motocicleta / Motoneta",
    "Vehículo registrado para tus viajes",
    "/configuracion/motocicleta",
    registered ? "complete" : "incomplete",
    [
      { label: "Alias", value: safeDisplayValue(vehicleDraft?.alias) },
      { label: "Tipo", value: safeDisplayValue(vehicleDraft?.vehicleType ? VEHICLE_TYPE_LABELS[vehicleDraft.vehicleType] : undefined) },
      { label: "Marca", value: safeDisplayValue(brand) },
      { label: "Modelo", value: safeDisplayValue(vehicleDraft?.model) },
      { label: "Año", value: vehicleDraft?.year ? String(vehicleDraft.year) : "No disponible" },
      { label: "Placa", value: plate ? maskLicensePlate(plate) : "No disponible" },
      ...(city ? [{ label: "Ciudad", value: city }] : []),
    ],
    registered ? undefined : "Registra tu vehículo para continuar",
  );
}

function buildContactoModule(session: SimulatedSession): SetupSummaryModule {
  const contacts = getStoredEmergencyContacts();
  const primaryContact = contacts.find((contact) => contact.id === session.emergencyContactId) ?? contacts[0] ?? null;

  const configured = session.emergencyContactConfigured && Boolean(session.emergencyContactId);
  const status: InvitationStatus | null = primaryContact?.invitationStatus ?? null;
  const contactPhone = primaryContact?.phone ?? "";

  let moduleStatus: SetupSummaryStatus;
  let blockingMessage: string | undefined;
  let warningMessage: string | undefined;

  if (configured && primaryContact && status) {
    if (status === "linked") {
      moduleStatus = "complete";
    } else if (status === "invited") {
      moduleStatus = "warning";
      warningMessage = CONTACT_LINK_WARNING;
    } else {
      moduleStatus = "incomplete";
      blockingMessage = `Tu contacto tiene una invitación ${status}. Envía nuevamente la invitación para continuar`;
    }
  } else {
    moduleStatus = "incomplete";
    blockingMessage = "Agrega un contacto de emergencia y envía la invitación";
  }

  return createModule(
    "contactos",
    "Contacto de emergencia",
    "Persona que recibirá tus alertas",
    "/configuracion/contactos",
    moduleStatus,
    [
      { label: "Nombre", value: safeDisplayValue(primaryContact?.fullName) },
      { label: "Parentesco", value: safeDisplayValue(primaryContact?.relationship) },
      {
        label: "Prioridad",
        value: primaryContact ? (primaryContact.priority === "principal" ? "Principal" : "Secundario") : "No disponible",
      },
      { label: "Teléfono", value: contactPhone ? maskPhone(contactPhone) : "No disponible" },
      { label: "Estado de invitación", value: status ? INVITATION_LABELS[status] : "No configurado" },
      {
        label: "Alertas críticas activas",
        value: primaryContact ? (primaryContact.permissions.criticalAlerts ? "Sí" : "No") : "No disponible",
      },
    ],
    blockingMessage,
    warningMessage,
  );
}

function formatSyncDate(value: string | null): string {
  if (!value) {
    return "Sin información";
  }

  return formatRelativeDate(value);
}

function buildDispositivosModule(session: SimulatedSession): SetupSummaryModule {
  const devicesState = getStoredDevicesState();
  const mobileDevice: MobileDevice | null = devicesState.mobileDevice;
  const smartwatchDevice: SmartwatchDevice | null = devicesState.smartwatchDevice;

  const mobileLinked = session.devicesConfigured && session.mobileDeviceLinked && Boolean(session.mobileDeviceId);

  const mobileName = mobileDevice?.name ?? "App MotoSOS";
  const mobileOs = mobileDevice?.operatingSystem ?? "No disponible";
  const mobileStatus = mobileDevice ? (mobileDevice.status === "linked" ? "Vinculado" : "Pendiente") : "No disponible";

  const details: SetupSummaryDetail[] = [
    { label: "App móvil", value: safeDisplayValue(mobileName) },
    { label: "Sistema operativo", value: safeDisplayValue(mobileOs) },
    { label: "Estado", value: mobileLinked ? mobileStatus : "No vinculado" },
    { label: "Última sincronización", value: formatSyncDate(mobileDevice?.lastSynchronization ?? null) },
  ];

  const hasSmartwatch = Boolean(smartwatchDevice);
  details.push({
    label: "Smartwatch",
    value: smartwatchDevice ? safeDisplayValue(smartwatchDevice.name) : "No vinculado",
  });

  if (smartwatchDevice) {
    details.push({
      label: "Estado del smartwatch",
      value: smartwatchDevice.status === "linked" ? "Vinculado" : "Pendiente",
    });
    if (typeof smartwatchDevice.batteryLevel === "number") {
      details.push({ label: "Batería", value: `${smartwatchDevice.batteryLevel}%` });
    }
  }

  let moduleStatus: SetupSummaryStatus;
  let blockingMessage: string | undefined;
  let warningMessage: string | undefined;

  if (!mobileLinked) {
    moduleStatus = "incomplete";
    blockingMessage = "Vincula la aplicación móvil para continuar";
  } else if (!hasSmartwatch) {
    moduleStatus = "warning";
    warningMessage = SMARTWATCH_WARNING;
  } else {
    moduleStatus = "complete";
  }

  return createModule(
    "dispositivos",
    "Dispositivos",
    "Dispositivos vinculados a tu cuenta",
    "/configuracion/dispositivos",
    moduleStatus,
    details,
    blockingMessage,
    warningMessage,
  );
}

function buildPlanModule(session: SimulatedSession): SetupSummaryModule {
  const planConfigured = session.planConfigured && session.planStatus === "active";
  const planName = PLAN_NAMES[session.plan] ?? "No disponible";
  const contactLimit = session.contactLimit > 0 ? String(session.contactLimit) : "Sin límite";
  const vehicleLimit = session.vehicleLimit > 0 ? String(session.vehicleLimit) : "Sin límite";

  let moduleStatus: SetupSummaryStatus;
  let blockingMessage: string | undefined;
  let warningMessage: string | undefined;

  if (!session.planConfigured) {
    moduleStatus = "incomplete";
    blockingMessage = "Confirma un plan activo para continuar";
  } else if (session.planStatus !== "active") {
    moduleStatus = "incomplete";
    blockingMessage = `Tu plan no está activo (estado: ${session.planStatus})`;
  } else if (session.plan === "basico") {
    moduleStatus = "warning";
    warningMessage = PLAN_UPGRADE_WARNING;
  } else {
    moduleStatus = "complete";
  }

  return createModule(
    "plan",
    "Plan actual",
    "Tu plan y licencia MotoSOS",
    "/configuracion/plan",
    moduleStatus,
    [
      { label: "Nombre del plan", value: planName },
      { label: "Estado", value: planConfigured ? "Activo" : "No activo" },
      { label: "Tipo de licencia", value: LICENSE_LABELS[session.licenseType] ?? "No disponible" },
      { label: "Límite de contactos", value: contactLimit },
      { label: "Límite de vehículos", value: vehicleLimit },
      { label: "Funciones esenciales activas", value: planConfigured ? "Sí" : "No" },
    ],
    blockingMessage,
    warningMessage,
  );
}

function buildModules(session: SimulatedSession | null): SetupSummaryModule[] {
  const safeSession: SimulatedSession = session ?? {
    userId: "",
    name: "",
    email: "",
    role: "conductor",
    setupCompleted: false,
    registrationStatus: "pending",
    setupCompletedAt: "",
    currentSetupStep: "perfil",
    plan: "basico",
    planStatus: "active",
    licenseType: "individual",
    contactLimit: 1,
    vehicleLimit: 1,
    driverLimit: 1,
    planConfigured: false,
    planActivatedAt: "",
    vehicleRegistered: false,
    vehicleId: null,
    emergencyContactConfigured: false,
    emergencyContactId: null,
    devicesConfigured: false,
    mobileDeviceLinked: false,
    smartwatchLinked: false,
    mobileDeviceId: null,
    smartwatchDeviceId: null,
  };

  return [
    buildCuentaModule(safeSession),
    buildPerfilModule(safeSession),
    buildVehiculoModule(safeSession),
    buildContactoModule(safeSession),
    buildDispositivosModule(safeSession),
    buildPlanModule(safeSession),
  ];
}

function buildModulesFromBackend(summary: OnboardingSummary): SetupSummaryModule[] {
  const accountComplete = Boolean(summary.user?.id && summary.user.fullName && summary.user.email);
  const profileComplete = isStepComplete(summary, "Profile");
  const vehicleComplete = isStepComplete(summary, "Vehicle");
  const contactComplete = isStepComplete(summary, "EmergencyContacts");
  const devicesComplete = isStepComplete(summary, "Devices");
  const planComplete = isStepComplete(summary, "Plan");
  const contactStatus = mapInvitationStatus(summary.emergencyContact?.invitationStatus);
  const plan = mapPlanId(summary.subscription?.planTier);
  const planActive = summary.subscription?.status?.toLowerCase() === "active";

  const modules: SetupSummaryModule[] = [
    createModule(
      "cuenta",
      "Cuenta",
      "Tu cuenta MotoSOS verificada",
      "",
      accountComplete ? "complete" : "incomplete",
      [
        { label: "Nombre", value: safeDisplayValue(summary.user?.fullName) },
        { label: "Correo", value: maskEmail(summary.user?.email ?? "") },
        { label: "Rol", value: "Conductor" },
        { label: "Estado", value: "Cuenta verificada" },
      ],
      accountComplete ? undefined : "Faltan datos de tu cuenta. Verifica tu sesión e inicia sesión de nuevo",
    ),
    createModule(
      "perfil",
      "Perfil",
      "Información personal básica",
      "/configuracion/perfil",
      profileComplete ? "complete" : "incomplete",
      [
        { label: "Nombre", value: safeDisplayValue(summary.profile?.fullName ?? summary.user?.fullName) },
        { label: "Correo", value: maskEmail(summary.user?.email ?? "") },
        { label: "Teléfono", value: summary.profile?.phoneNumber ? maskPhone(summary.profile.phoneNumber) : "No disponible" },
        { label: "Ciudad", value: safeDisplayValue(summary.profile?.primaryCity) },
      ],
      profileComplete ? undefined : "Completa la información básica de tu perfil",
    ),
    createModule(
      "motocicleta",
      "Motocicleta / Motoneta",
      "Vehículo registrado para tus viajes",
      "/configuracion/motocicleta",
      vehicleComplete ? "complete" : "incomplete",
      [
        { label: "Alias", value: safeDisplayValue(summary.vehicle?.alias) },
        { label: "Tipo", value: formatBackendVehicleType(summary.vehicle?.vehicleType) },
        { label: "Marca", value: safeDisplayValue(summary.vehicle?.brand) },
        { label: "Modelo", value: safeDisplayValue(summary.vehicle?.model) },
        { label: "Año", value: summary.vehicle?.year ? String(summary.vehicle.year) : "No disponible" },
      ],
      vehicleComplete ? undefined : "Registra tu vehículo para continuar",
    ),
    createModule(
      "contactos",
      "Contacto de emergencia",
      "Persona que recibirá tus alertas",
      "/configuracion/contactos",
      contactComplete ? (contactStatus === "invited" ? "warning" : "complete") : "incomplete",
      [
        { label: "Nombre", value: safeDisplayValue(summary.emergencyContact?.fullName) },
        { label: "Parentesco", value: safeDisplayValue(summary.emergencyContact?.relationship) },
        { label: "Prioridad", value: summary.emergencyContact ? "Principal" : "No disponible" },
        {
          label: "Teléfono",
          value: summary.emergencyContact?.phoneNumber ? maskPhone(summary.emergencyContact.phoneNumber) : "No disponible",
        },
        { label: "Estado de invitación", value: contactStatus ? INVITATION_LABELS[contactStatus] : "No configurado" },
        { label: "Alertas críticas activas", value: summary.emergencyContact ? "Sí" : "No disponible" },
      ],
      contactComplete ? undefined : "Agrega un contacto de emergencia y envía la invitación",
      contactStatus === "invited" ? CONTACT_LINK_WARNING : undefined,
    ),
    createModule(
      "dispositivos",
      "Dispositivos",
      "Dispositivos vinculados a tu cuenta",
      "/configuracion/dispositivos",
      devicesComplete ? (summary.smartwatch ? "complete" : "warning") : "incomplete",
      [
        { label: "App móvil", value: safeDisplayValue(summary.mobileDevice?.deviceName ?? "App MotoSOS") },
        { label: "Sistema operativo", value: safeDisplayValue(summary.mobileDevice?.platform) },
        { label: "Estado", value: devicesComplete ? "Vinculado" : "No vinculado" },
        { label: "Última sincronización", value: "Sin información" },
        { label: "Smartwatch", value: summary.smartwatch ? safeDisplayValue(summary.smartwatch.deviceName) : "No vinculado" },
      ],
      devicesComplete ? undefined : "Vincula la aplicación móvil para continuar",
      devicesComplete && !summary.smartwatch ? SMARTWATCH_WARNING : undefined,
    ),
    createModule(
      "plan",
      "Plan actual",
      "Tu plan y licencia MotoSOS",
      "/configuracion/plan",
      planComplete && planActive ? (plan === "basico" ? "warning" : "complete") : "incomplete",
      [
        { label: "Nombre del plan", value: PLAN_NAMES[plan] },
        { label: "Estado", value: planActive ? "Activo" : "No activo" },
        { label: "Tipo de licencia", value: LICENSE_LABELS.individual },
        { label: "Límite de contactos", value: plan === "basico" ? "1" : "Sin límite" },
        { label: "Límite de vehículos", value: plan === "basico" ? "1" : "Sin límite" },
        { label: "Funciones esenciales activas", value: planComplete && planActive ? "Sí" : "No" },
      ],
      planComplete && planActive ? undefined : "Confirma un plan activo para continuar",
      plan === "basico" ? PLAN_UPGRADE_WARNING : undefined,
    ),
  ];

  return modules;
}

function createValidationFromModules(modules: SetupSummaryModule[]): SetupCompletionValidation {
  const blockingIssues = modules
    .filter((module) => module.status === "incomplete")
    .map((module) => module.blockingMessage ?? `Completa el módulo ${module.title}`)
    .filter((message, index, all) => message.length > 0 && all.indexOf(message) === index);

  const warnings = modules
    .filter((module) => module.status === "warning" && module.warningMessage)
    .map((module) => module.warningMessage as string)
    .concat(DOCUMENTS_WARNING)
    .filter((message, index, all) => all.indexOf(message) === index);

  return {
    isValid: blockingIssues.length === 0,
    modules,
    blockingIssues,
    warnings,
  };
}

export function getSetupSummary(): SetupCompletionValidation {
  const session = getSession();
  const modules = buildModules(session);

  return createValidationFromModules(modules);
}

export async function getLiveSetupSummary(): Promise<SetupCompletionValidation> {
  const summary = await getOnboardingSummary();
  return createValidationFromModules(buildModulesFromBackend(summary));
}

export async function getSetupSummaryWithFallback(): Promise<SetupCompletionValidation> {
  try {
    return await getLiveSetupSummary();
  } catch {
    return getSetupSummary();
  }
}

export function validateSetupCompletion(): SetupCompletionValidation {
  return getSetupSummary();
}

export async function completeInitialSetup(): Promise<CompleteSetupResponse> {
  const validation = await getSetupSummaryWithFallback();

  if (!validation.isValid) {
    return {
      success: false,
      message: "Hay información pendiente por completar antes de activar tu cuenta",
      data: null,
    };
  }

  const session = getSession();

  if (!session) {
    return {
      success: false,
      message: "No pudimos verificar tu sesión. Inicia sesión de nuevo",
      data: null,
    };
  }

  try {
    const result = await confirmOnboarding();
    const completedAt = result.completedAtUtc ?? new Date().toISOString();

    updateSession({
      setupCompleted: true,
      currentSetupStep: "completed",
      registrationStatus: "completed",
      setupCompletedAt: completedAt,
      accountStatus: "active",
    });

    return {
      success: true,
      message: "Tu cuenta MotoSOS ha sido activada correctamente",
      data: {
        setupCompleted: true,
        completedAt,
        nextRoute: "/dashboard/resumen",
      },
    };
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error), data: null };
  }
}
