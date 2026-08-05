import axios, {
  AxiosError,
  type AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { apiConfig, hasApiBaseUrl } from "../config/apiConfig";
import type { ApiResponse, RefreshTokens } from "../types/auth";
import {
  clearAuthTokens,
  getAuthTokens,
  saveAuthTokens,
} from "./authTokenService";
import { clearSession, getActiveUserId } from "./sessionService";
import { isAccessTokenUsable } from "../utils/tokenExpiry";

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const PUBLIC_ENDPOINTS = [
  "/health",
  "/health/ready",
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/forgot-password",
  "/api/v1/auth/request-access-code",
  "/api/v1/auth/login-with-code",
  "/api/v1/auth/refresh",
  "/openapi/v1.json",
];

export class ApiRequestError extends Error {
  code: string;
  status: number | null;

  constructor(code: string, message: string, status: number | null) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
  }
}

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler;
}

function isPublicPath(url: string | undefined): boolean {
  if (!url) {
    return false;
  }

  const path = url.split("?")[0];
  const normalized = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

  return PUBLIC_ENDPOINTS.includes(normalized);
}

interface EnvelopeBody<T> {
  success?: unknown;
  data?: unknown;
  error?: { code?: unknown; message?: unknown } | null;
}

function throwFromEnvelope(status: number | null, code: string | undefined, message: string | undefined) {
  const errorCode = code ?? (status != null ? `http_${status}` : "network");
  const fallback =
    status != null ? "El servicio de MotoSOS no está disponible temporalmente" : "No fue posible conectar con MotoSOS";
  throw new ApiRequestError(errorCode, message?.length ? message : fallback, status);
}

export function unwrap<T>(response: AxiosResponse<ApiResponse<T> | null>): T {
  const body = response.data as EnvelopeBody<T> | null;

  if (body && typeof body === "object" && "success" in body) {
    if (body.success) {
      return body.data as T;
    }

    const code = typeof body.error?.code === "string" ? body.error.code : undefined;
    const message = typeof body.error?.message === "string" ? body.error.message : undefined;
    throwFromEnvelope(response.status, code, message);
  }

  return body as T;
}

const publicApi: AxiosInstance = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: apiConfig.timeoutMs,
});

const api: AxiosInstance = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: apiConfig.timeoutMs,
});

api.interceptors.request.use((config) => {
  if (isPublicPath(config.url)) {
    return config;
  }

  const userId = getActiveUserId();

  if (userId) {
    const tokens = getAuthTokens(userId);

    if (tokens) {
      config.headers.set("Authorization", `Bearer ${tokens.accessToken}`);
    }
  }

  return config;
});

function isWrappedAuthError(error: AxiosError): boolean {
  const body = error.response?.data as (ApiResponse<unknown> & Record<string, unknown>) | undefined;

  if (body && typeof body === "object" && "success" in body) {
    const code = typeof body.error?.code === "string" ? body.error.code : "";

    return (
      code.toLowerCase().includes("unauthorized") ||
      code.toLowerCase().includes("token-expired") ||
      code.toLowerCase() === "invalid_token"
    );
  }

  return false;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function extractRefreshTokens(body: ApiResponse<RefreshTokens> | null): RefreshTokens | null {
  const candidate = body?.data as
    | (Partial<RefreshTokens> & { tokens?: Record<string, unknown> })
    | undefined;

  if (!candidate) {
    return null;
  }

  const source = candidate.tokens ?? candidate;
  const accessToken = readString(source.accessToken);
  const refreshToken = readString(source.refreshToken);

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAtUtc: readOptionalString(source.accessTokenExpiresAtUtc),
    refreshTokenExpiresAtUtc: readOptionalString(source.refreshTokenExpiresAtUtc),
  };
}

let refreshInFlight: Promise<RefreshTokens> | null = null;

export function refreshTokensOnce(): Promise<RefreshTokens> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  const userId = getActiveUserId();

  if (!userId) {
    return Promise.reject(new ApiRequestError("session-expired", "Tu sesión expiró. Inicia sesión nuevamente", null));
  }

  const tokens = getAuthTokens(userId);

  if (!tokens?.refreshToken) {
    return Promise.reject(new ApiRequestError("session-expired", "Tu sesión expiró. Inicia sesión nuevamente", null));
  }

  refreshInFlight = publicApi
    .post<ApiResponse<RefreshTokens>>("/api/v1/auth/refresh", {
      refreshToken: tokens.refreshToken,
    })
    .then((response) => {
      const nextTokens = extractRefreshTokens(response.data);

      if (!nextTokens) {
        throw new ApiRequestError("session-expired", "Tu sesión expiró. Inicia sesión nuevamente", response.status);
      }

      saveAuthTokens(userId, nextTokens);
      return nextTokens;
    })
    .catch((error) => {
      if (error instanceof ApiRequestError) {
        throw error;
      }

      throw new ApiRequestError("session-expired", "Tu sesión expiró. Inicia sesión nuevamente", null);
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

export async function ensureFreshAccessToken(): Promise<void> {
  const userId = getActiveUserId();

  if (!userId) {
    return;
  }

  const tokens = getAuthTokens(userId);

  if (!tokens?.accessToken) {
    return;
  }

  if (isAccessTokenUsable(tokens.accessTokenExpiresAtUtc)) {
    return;
  }

  await refreshTokensOnce();
}

function handleAuthExpired() {
  const userId = getActiveUserId();

  if (userId) {
    clearAuthTokens(userId);
  }

  clearSession();
  unauthorizedHandler?.();
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = (error.config ?? {}) as RetryableConfig;

    if (!config) {
      return Promise.reject(error);
    }

    if (isPublicPath(config.url)) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const isAuthError = status === 401 || isWrappedAuthError(error);

    if (isAuthError && !config._retry) {
      config._retry = true;

      try {
        const refreshed = await refreshTokensOnce();
        const userId = getActiveUserId();

        if (userId) {
          saveAuthTokens(userId, {
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            accessTokenExpiresAtUtc: refreshed.accessTokenExpiresAtUtc,
            refreshTokenExpiresAtUtc: refreshed.refreshTokenExpiresAtUtc,
          });
        }

        const headers = config.headers as AxiosHeaders;
        headers.set("Authorization", `Bearer ${refreshed.accessToken}`);

        return publicApi(config);
      } catch (refreshError) {
        handleAuthExpired();

        if (refreshError instanceof ApiRequestError) {
          return Promise.reject(refreshError);
        }

        return Promise.reject(new ApiRequestError("session-expired", "Tu sesión expiró. Inicia sesión nuevamente", null));
      }
    }

    return Promise.reject(error);
  },
);

export { api, publicApi };

export function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError;
}

export function isRetryableConfig(value: AxiosRequestConfig | undefined): value is RetryableConfig {
  return Boolean(value);
}
