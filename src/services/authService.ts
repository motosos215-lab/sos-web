import type {
  ApiResponse,
  ApiUserProfile,
  LoginCredentials,
  LoginData,
  LoginWithCodeRequest,
  LoginWithCodeResult,
  RegisterRequest,
} from "../types/auth";
import { api, ApiRequestError, publicApi, unwrap } from "./api";
import { hasApiBaseUrl } from "../config/apiConfig";
import { clearAuthTokens, getAuthTokens, saveAuthTokens } from "./authTokenService";
import {
  clearSession,
  getActiveUserId,
  getSessionForUser,
  saveSession,
  updateSession,
  type SetupStepKey,
  type SimulatedSession,
  type UserRole,
} from "./sessionService";
import { getOnboardingStatus, getSetupStepFromOnboardingStatus } from "./onboardingService";
import { mapApiRoleToAppRole } from "../utils/authRole";
import { toValidDateIso } from "../utils/tokenExpiry";

const ROLE_INCOMPATIBLE_MESSAGE = "Tu cuenta tiene un rol que todavía no es compatible con esta aplicación";

function assertApiBaseUrl() {
  if (!hasApiBaseUrl()) {
    throw new ApiRequestError(
      "missing_config",
      "La aplicación no tiene configurada la dirección del servicio",
      null,
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object";
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isEmailLike(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

interface RawTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtUtc?: string;
  refreshTokenExpiresAtUtc?: string;
}

function extractLoginTokens(body: ApiResponse<LoginData> | null | undefined): RawTokens | null {
  if (!body || !body.success || body.data == null || !isRecord(body.data)) {
    return null;
  }

  const data = body.data;
  const tokensSource = isRecord(data.tokens) ? data.tokens : data;
  const accessToken = readString(tokensSource.accessToken);
  const refreshToken = readString(tokensSource.refreshToken);

  if (!accessToken || !refreshToken) {
    return null;
  }

  const accessTokenExpiresAtUtc = toValidDateIso(tokensSource.accessTokenExpiresAtUtc);

  if (!accessTokenExpiresAtUtc) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAtUtc,
    refreshTokenExpiresAtUtc: readOptionalString(tokensSource.refreshTokenExpiresAtUtc),
  };
}

function extractApiUserProfile(value: unknown): ApiUserProfile | null {
  if (!isRecord(value)) {
    return null;
  }

  const source = isRecord(value.user) ? value.user : value;

  return parseApiUserProfile(source);
}

function extractUserFromEnvelope(body: ApiResponse<LoginData> | null | undefined): ApiUserProfile | null {
  if (!body || !body.success || body.data == null || !isRecord(body.data)) {
    return null;
  }

  return extractApiUserProfile(body.data.user);
}

function parseApiUserProfile(value: unknown): ApiUserProfile | null {
  if (!isRecord(value)) {
    return null;
  }

  const userId = readString(value.id);
  const email = readString(value.email);
  const fullName = readString(value.fullName);
  const role = readString(value.role);
  const isActive = value.isActive;

  if (!userId || !email || !isEmailLike(email) || !fullName || !role || typeof isActive !== "boolean") {
    return null;
  }

  return {
    id: userId,
    email,
    fullName,
    phoneNumber: readNullableString(value.phoneNumber),
    role,
    isActive,
    createdAtUtc: readOptionalString(value.createdAtUtc),
    updatedAtUtc: readOptionalString(value.updatedAtUtc),
    lastLoginAtUtc: readNullableString(value.lastLoginAtUtc),
  };
}

async function fetchUserWithToken(accessToken: string): Promise<ApiUserProfile> {
  const response = await publicApi.get<ApiResponse<unknown>>("/api/v1/users/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const user = extractApiUserProfile(unwrap<unknown>(response));

  if (!user) {
    throw new ApiRequestError("invalid_response", "Recibimos una respuesta inesperada del servicio", response.status);
  }

  return user;
}

function createInitialSession(user: ApiUserProfile, role: UserRole): SimulatedSession {
  const isConductor = role === "conductor";
  const nowIso = new Date().toISOString();

  return {
    userId: user.id,
    name: user.fullName,
    email: user.email,
    role,
    accountStatus: "active",
    setupCompleted: !isConductor,
    registrationStatus: isConductor ? "pending" : "completed",
    setupCompletedAt: isConductor ? "" : nowIso,
    currentSetupStep: (isConductor ? "perfil" : "completed") as SetupStepKey,
    plan: "basico",
    planStatus: "active",
    licenseType: "individual",
    contactLimit: 1,
    vehicleLimit: 1,
    driverLimit: 1,
    planConfigured: isConductor ? false : true,
    planActivatedAt: nowIso,
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
}

export function mergeAuthenticatedUserWithSetupState(user: ApiUserProfile, role: UserRole): SimulatedSession {
  const existingSession = getSessionForUser(user.id);

  if (existingSession) {
    const nextSession: SimulatedSession = {
      ...existingSession,
      userId: user.id,
      name: user.fullName,
      email: user.email,
      role,
      accountStatus: "active",
      setupCompleted: role === "conductor" ? existingSession.setupCompleted : true,
      registrationStatus: role === "conductor" ? existingSession.registrationStatus : "completed",
      currentSetupStep: role === "conductor" ? existingSession.currentSetupStep : "completed",
    };

    saveSession(nextSession);
    return nextSession;
  }

  const session = createInitialSession(user, role);
  saveSession(session);
  return session;
}

export async function syncRiderOnboardingSession(session: SimulatedSession): Promise<SimulatedSession> {
  if (session.role !== "conductor") {
    return session;
  }

  const status = await getOnboardingStatus();
  const nextStep = getSetupStepFromOnboardingStatus(status, session.currentSetupStep);
  const setupCompleted = status.isCompleted === true || status.isConfirmed === true || nextStep === "completed";
  const completedAt = setupCompleted ? session.setupCompletedAt || new Date().toISOString() : "";

  const updates: Partial<SimulatedSession> = {
    setupCompleted,
    registrationStatus: setupCompleted ? "completed" : "pending",
    currentSetupStep: setupCompleted ? "completed" : nextStep,
    setupCompletedAt: completedAt,
    accountStatus: "active",
    onboardingStatusSnapshot: status,
  };

  return updateSession(updates) ?? { ...session, ...updates };
}

function throwIncompatibleRole(): never {
  clearSession();
  throw new ApiRequestError("role_incompatible", ROLE_INCOMPATIBLE_MESSAGE, null);
}

export async function getCurrentUser(): Promise<ApiUserProfile> {
  const response = await api.get<ApiResponse<unknown>>("/api/v1/users/me");
  const user = extractApiUserProfile(unwrap<unknown>(response));

  if (!user) {
    throw new ApiRequestError("invalid_response", "Recibimos una respuesta inesperada del servicio", response.status);
  }

  return user;
}

export async function login(credentials: LoginCredentials): Promise<SimulatedSession> {
  assertApiBaseUrl();

  const response = await publicApi.post<ApiResponse<LoginData>>("/api/v1/auth/login", {
    email: credentials.email,
    password: credentials.password,
    rememberMe: credentials.rememberMe,
  });

  const tokens = extractLoginTokens(response.data);

  if (!tokens) {
    throw new ApiRequestError("invalid_response", "Recibimos una respuesta inesperada del servicio", response.status);
  }

  const loginUser = extractUserFromEnvelope(response.data);

  if (!loginUser) {
    throw new ApiRequestError("invalid_response", "Recibimos una respuesta inesperada del servicio", response.status);
  }

  if (loginUser.isActive !== true) {
    throw new ApiRequestError("inactive_account", "Esta cuenta no está activa", null);
  }

  saveAuthTokens(loginUser.id, tokens);

  const user = await fetchUserWithToken(tokens.accessToken);

  if (user.id !== loginUser.id) {
    clearAuthTokens(loginUser.id);
    clearSession();
    throw new ApiRequestError("session_validation_failed", "No fue posible validar la sesión", null);
  }

  if (user.isActive !== true) {
    clearAuthTokens(user.id);
    throw new ApiRequestError("inactive_account", "Esta cuenta no está activa", null);
  }

  const roleResult = mapApiRoleToAppRole(user.role);

  if (!roleResult.ok) {
    throwIncompatibleRole();
  }

  const session = mergeAuthenticatedUserWithSetupState(user, roleResult.role);
  return syncRiderOnboardingSession(session);
}

export async function register(data: RegisterRequest): Promise<void> {
  assertApiBaseUrl();

  const response = await publicApi.post<ApiResponse<unknown>>("/api/v1/auth/register", {
    fullName: data.fullName,
    email: data.email,
    phoneNumber: data.phoneNumber,
    password: data.password,
    confirmPassword: data.confirmPassword,
    accountType: data.accountType,
    acceptTerms: data.acceptTerms,
  });

  const body = response.data as ApiResponse<{ user: { id: string; email: string; role: string } } | null> | null;

  if (!body || !body.success || !body.data || !body.data.user || !body.data.user.id || !body.data.user.email || !body.data.user.role) {
    throw new ApiRequestError("invalid_response", "La respuesta del registro no es válida", response.status);
  }
}

export async function forgotPassword(email: string): Promise<void> {
  assertApiBaseUrl();

  await publicApi.post("/api/v1/auth/forgot-password", {
    email,
  });
}

export async function logout(): Promise<void> {
  const userId = getActiveUserId();

  if (!userId) {
    clearSession();
    return;
  }

  try {
    const tokens = getAuthTokens(userId);
    await publicApi.post<unknown>("/api/v1/auth/logout", {
      refreshToken: tokens?.refreshToken ?? "",
    });
  } catch {
    // Best-effort: the session is cleared locally regardless of the server response.
  } finally {
    clearAuthTokens(userId);
    clearSession();
  }
}

export async function requestAccessCode(email: string): Promise<void> {
  assertApiBaseUrl();

  const response = await publicApi.post<ApiResponse<unknown>>("/api/v1/auth/request-access-code", {
    email,
  });

  unwrap<unknown>(response);
}

export async function loginWithCode(_request: LoginWithCodeRequest): Promise<LoginWithCodeResult> {
  try {
    assertApiBaseUrl();
    const response = await publicApi.post<ApiResponse<unknown>>("/api/v1/auth/login-with-code", {
      code: _request.code,
    });
    unwrap<unknown>(response);
  } catch (error) {
    if (error instanceof ApiRequestError && error.code === "http_501") {
      return {};
    }

    throw error;
  }

  return {};
}
