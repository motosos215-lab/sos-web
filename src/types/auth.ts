export interface ApiErrorInfo {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiErrorInfo | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtUtc?: string;
  refreshTokenExpiresAtUtc?: string;
}

export type ApiRole =
  | "Rider"
  | "Conductor"
  | "Monitor"
  | "Administrator"
  | "Admin";

export interface ApiUserProfile {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  role: string;
  isActive: boolean;
  createdAtUtc?: string;
  updatedAtUtc?: string;
  lastLoginAtUtc?: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginData {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtUtc: string;
  refreshTokenExpiresAtUtc?: string;
  user: ApiUserProfile;
}

export type RegisterAccountType = "Conductor" | "Monitor";

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phoneNumber: string;
  accountType: RegisterAccountType;
  acceptTerms: boolean;
}

export interface RefreshTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtUtc?: string;
  refreshTokenExpiresAtUtc?: string;
}

export interface LoginEnvelopeData {
  accessToken?: unknown;
  refreshToken?: unknown;
  accessTokenExpiresAtUtc?: unknown;
  refreshTokenExpiresAtUtc?: unknown;
  tokens?: Record<string, unknown>;
  user?: Record<string, unknown>;
}

export interface RequestAccessCodeResult {
  requested: true;
}

export interface LoginWithCodeRequest {
  code: string;
}

export interface LoginWithCodeResult {
  tokens?: AuthTokens;
  user?: ApiUserProfile;
}
