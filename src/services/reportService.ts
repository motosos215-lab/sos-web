import type { ApiResponse } from "../types/auth";
import { api, unwrap } from "./api";

export interface ResolutionReportSummary {
  id: string;
  incidentId: string;
  outcome: string;
  summary: string;
  responseTimeSeconds: number | null;
  incidentClosedAtUtc: string | null;
  createdAtUtc: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readReports(value: unknown): ResolutionReportSummary[] {
  const list =
    isRecord(value) && Array.isArray(value.reports)
      ? value.reports
      : isRecord(value) && Array.isArray(value.items)
        ? value.items
        : Array.isArray(value)
          ? value
          : [];

  return list.filter(isRecord).map((item) => ({
    id: readString(item.id, readString(item.incidentId, "report")),
    incidentId: readString(item.incidentId),
    outcome: readString(item.outcome, "N/A"),
    summary: readString(item.summary, "Sin resumen"),
    responseTimeSeconds: readNullableNumber(item.responseTimeSeconds),
    incidentClosedAtUtc: readNullableString(item.incidentClosedAtUtc),
    createdAtUtc: readString(item.createdAtUtc, new Date().toISOString()),
  }));
}

export async function getResolutionReports(): Promise<ResolutionReportSummary[]> {
  const response = await api.get<ApiResponse<unknown>>("/api/v1/rider/emergencies/resolution-reports");
  return readReports(unwrap<unknown>(response));
}
