const DEFAULT_TIMEOUT_MS = 15000;

function usesSameOriginApiProxy(rawUrl: unknown): boolean {
  if (typeof rawUrl === "string" && rawUrl.trim().replace(/\/+$/, "") === "/api") {
    return true;
  }

  return typeof window !== "undefined" && window.location.hostname.endsWith("netlify.app");
}

function readBaseUrl(): string {
  const rawUrl = import.meta.env.VITE_API_BASE_URL ?? "";

  if (usesSameOriginApiProxy(rawUrl)) {
    return "";
  }

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
  return usesSameOriginApiProxy(import.meta.env.VITE_API_BASE_URL) || apiConfig.baseUrl.length > 0;
}
