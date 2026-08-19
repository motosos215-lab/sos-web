import type { ApiResponse } from "../types/auth";
import { api, unwrap } from "./api";
import { SIMULATED_INCIDENT_FOLIO, SIMULATED_TRIP_ID } from "./incidentService";

export const DEMO_MONITOR_ALERT_ID = "DEMO-MONITOR-001";
export const DEMO_MONITOR_INCIDENT_ID = "DEMO-MONITOR-INCIDENT-001";

export interface EmergencyStatusSummary {
  incident: {
    id: string;
    status: string;
    source: string;
    cause: string;
    riskLevel: string;
    occurredAtUtc: string;
    createdAtUtc: string;
  };
  trip: { id: string; status: string; startedAtUtc: string; finishedAtUtc: string | null } | null;
  alertDispatch: { id: string; status: string; priority: string; reason: string; createdAtUtc: string } | null;
  notifications: { total: number; prepared: number; simulatedSent: number; failed: number; cancelled: number };
  acknowledgements: { total: number; pending: number; viewed: number; acknowledged: number; declined: number };
  location: {
    available: boolean;
    incidentId: string | null;
    tripId: string | null;
    latitude: number | null;
    longitude: number | null;
    accuracyMeters: number | null;
    source: string | null;
    recordedAtUtc: string | null;
    receivedAtUtc: string | null;
    isActive: boolean | null;
    isStale: boolean | null;
  };
  overallStatus: string;
  requiresAttention: boolean;
  lastUpdatedAtUtc: string;
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

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readNullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function readCounts(value: unknown, keys: string[]) {
  const source = isRecord(value) ? value : {};
  return Object.fromEntries(keys.map((key) => [key, readNumber(source[key])])) as Record<string, number>;
}

function readStatus(value: unknown): EmergencyStatusSummary {
  const source = isRecord(value) ? value : {};
  const incident = isRecord(source.incident) ? source.incident : {};
  const trip = isRecord(source.trip) ? source.trip : null;
  const alertDispatch = isRecord(source.alertDispatch) ? source.alertDispatch : null;
  const location = isRecord(source.location) ? source.location : {};
  const notifications = readCounts(source.notifications, ["total", "prepared", "simulatedSent", "failed", "cancelled"]);
  const acknowledgements = readCounts(source.acknowledgements, ["total", "pending", "viewed", "acknowledged", "declined"]);

  return {
    incident: {
      id: readString(incident.id),
      status: readString(incident.status, "Unknown"),
      source: readString(incident.source, "Unknown"),
      cause: readString(incident.cause, "Unknown"),
      riskLevel: readString(incident.riskLevel, "Unknown"),
      occurredAtUtc: readString(incident.occurredAtUtc, new Date().toISOString()),
      createdAtUtc: readString(incident.createdAtUtc, new Date().toISOString()),
    },
    trip: trip
      ? {
          id: readString(trip.id),
          status: readString(trip.status, "Unknown"),
          startedAtUtc: readString(trip.startedAtUtc, new Date().toISOString()),
          finishedAtUtc: readNullableString(trip.finishedAtUtc),
        }
      : null,
    alertDispatch: alertDispatch
      ? {
          id: readString(alertDispatch.id),
          status: readString(alertDispatch.status, "Unknown"),
          priority: readString(alertDispatch.priority, "Unknown"),
          reason: readString(alertDispatch.reason, "Unknown"),
          createdAtUtc: readString(alertDispatch.createdAtUtc, new Date().toISOString()),
        }
      : null,
    notifications: {
      total: notifications.total,
      prepared: notifications.prepared,
      simulatedSent: notifications.simulatedSent,
      failed: notifications.failed,
      cancelled: notifications.cancelled,
    },
    acknowledgements: {
      total: acknowledgements.total,
      pending: acknowledgements.pending,
      viewed: acknowledgements.viewed,
      acknowledged: acknowledgements.acknowledged,
      declined: acknowledgements.declined,
    },
    location: {
      available: location.available === true,
      incidentId: readNullableString(location.incidentId),
      tripId: readNullableString(location.tripId),
      latitude: readNullableNumber(location.latitude),
      longitude: readNullableNumber(location.longitude),
      accuracyMeters: readNullableNumber(location.accuracyMeters),
      source: readNullableString(location.source),
      recordedAtUtc: readNullableString(location.recordedAtUtc),
      receivedAtUtc: readNullableString(location.receivedAtUtc),
      isActive: readNullableBoolean(location.isActive),
      isStale: readNullableBoolean(location.isStale),
    },
    overallStatus: readString(source.overallStatus, "Unknown"),
    requiresAttention: source.requiresAttention === true,
    lastUpdatedAtUtc: readString(source.lastUpdatedAtUtc, new Date().toISOString()),
  };
}

function createDemoStatus(kind: "rider" | "monitor"): EmergencyStatusSummary {
  const now = new Date().toISOString();
  const incidentId = kind === "rider" ? SIMULATED_INCIDENT_FOLIO : DEMO_MONITOR_INCIDENT_ID;
  const tripId = kind === "rider" ? SIMULATED_TRIP_ID : "demo-monitor-trip";

  return {
    incident: {
      id: incidentId,
      status: "Open",
      source: kind === "rider" ? "ManualSos" : "MobileDetection",
      cause: kind === "rider" ? "ManualSos" : "CountdownTimeout",
      riskLevel: "High",
      occurredAtUtc: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      createdAtUtc: new Date(Date.now() - 8 * 60 * 1000 + 5000).toISOString(),
    },
    trip: {
      id: tripId,
      status: "Active",
      startedAtUtc: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
      finishedAtUtc: null,
    },
    alertDispatch: {
      id: kind === "rider" ? "DEMO-DISPATCH-001" : "DEMO-MONITOR-DISPATCH-001",
      status: "PendingDispatch",
      priority: "Critical",
      reason: "IncidentCreated",
      createdAtUtc: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
    },
    notifications: { total: 3, prepared: 0, simulatedSent: 3, failed: 0, cancelled: 0 },
    acknowledgements: { total: 2, pending: 1, viewed: 1, acknowledged: kind === "monitor" ? 0 : 1, declined: 0 },
    location: {
      available: true,
      incidentId,
      tripId,
      latitude: kind === "rider" ? 20.0911 : 19.4326,
      longitude: kind === "rider" ? -98.7624 : -99.1332,
      accuracyMeters: 8,
      source: "MotoSOS Demo",
      recordedAtUtc: new Date(Date.now() - 90 * 1000).toISOString(),
      receivedAtUtc: now,
      isActive: true,
      isStale: false,
    },
    overallStatus: kind === "monitor" ? "AwaitingAcknowledgement" : "Acknowledged",
    requiresAttention: kind === "monitor",
    lastUpdatedAtUtc: now,
  };
}

export async function getRiderEmergencyStatus(incidentId: string): Promise<EmergencyStatusSummary> {
  if (incidentId === SIMULATED_INCIDENT_FOLIO) {
    return createDemoStatus("rider");
  }

  const response = await api.get<ApiResponse<unknown>>(`/api/v1/rider/emergencies/${encodeURIComponent(incidentId)}/status`);
  return readStatus(unwrap<unknown>(response));
}

export async function getMonitorEmergencyStatus(notificationDeliveryAttemptId: string): Promise<EmergencyStatusSummary> {
  if (notificationDeliveryAttemptId === DEMO_MONITOR_ALERT_ID) {
    return createDemoStatus("monitor");
  }

  const response = await api.get<ApiResponse<unknown>>(
    `/api/v1/monitor/alerts/${encodeURIComponent(notificationDeliveryAttemptId)}/status`,
  );
  return readStatus(unwrap<unknown>(response));
}
