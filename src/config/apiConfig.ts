const DEFAULT_TIMEOUT_MS = 15000;

function readBaseUrl(): string {
  const rawUrl = import.meta.env.VITE_API_BASE_URL ?? "";

  return typeof rawUrl === "string" ? rawUrl.trim().replace(/\/+$/, "") : "";
}

function readTimeoutMs(): number {
  const rawTimeout = import.meta.env.VITE_API_TIMEOUT_MS;
  const parsed = Number(rawTimeout);

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return DEFAULT_TIMEOUT_MS;
}

export interface ApiConfig {
  baseUrl: string;
  timeoutMs: number;
}

export const apiConfig: ApiConfig = {
  baseUrl: readBaseUrl(),
  timeoutMs: readTimeoutMs(),
};

export function hasApiBaseUrl(): boolean {
  return apiConfig.baseUrl.length > 0;
}
