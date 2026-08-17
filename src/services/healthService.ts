import { publicApi } from "./api";

export interface HealthCheckResult {
  reachable: boolean;
  status: string | null;
  ready: boolean | null;
}

export async function checkHealth(): Promise<HealthCheckResult> {
  try {
    const response = await publicApi.get<unknown>("/health");
    const status = extractStatus(response.data);

    return {
      reachable: true,
      status,
      ready: null,
    };
  } catch {
    return {
      reachable: false,
      status: null,
      ready: null,
    };
  }
}

export async function checkReady(): Promise<HealthCheckResult> {
  try {
    const response = await publicApi.get<unknown>("/health/ready");
    const isReady = extractStatus(response.data)?.toLowerCase() === "ready";

    return {
      reachable: true,
      status: extractStatus(response.data),
      ready: isReady,
    };
  } catch {
    return {
      reachable: false,
      status: null,
      ready: null,
    };
  }
}

function extractStatus(data: unknown): string | null {
  if (data && typeof data === "object") {
    const value = (data as Record<string, unknown>).status;

    if (typeof value === "string") {
      return value;
    }
  }

  return null;
}
