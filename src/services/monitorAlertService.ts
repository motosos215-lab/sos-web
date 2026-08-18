import type { ApiResponse } from "../types/auth";
import { api, unwrap } from "./api";
import {
  DEMO_MONITOR_ALERT_ID,
  DEMO_MONITOR_INCIDENT_ID,
  getMonitorEmergencyStatus,
  type EmergencyStatusSummary,
} from "./emergencyStatusService";

export interface MonitorAlert {
  id: string;
  alertDispatchId: string;
  notificationDeliveryAttemptId: string;
  incidentId: string;
  tripId: string | null;
  emergencyContactId: string;
  status: string;
  responseType: string;
  message: string | null;
  viewedAtUtc: string | null;
  acknowledgedAtUtc: string | null;
  declinedAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface MonitorAlertDetails {
  alert: MonitorAlert;
  status: EmergencyStatusSummary | null;
}

const DEMO_MONITOR_ALERT_KEY = "motosos.demo.monitorAlert";
let memoryDemoMonitorAlert: MonitorAlert | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readAlert(value: unknown): MonitorAlert | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const notificationDeliveryAttemptId = readString(value.notificationDeliveryAttemptId, id);

  if (!id || !notificationDeliveryAttemptId) {
    return null;
  }

  return {
    id,
    alertDispatchId: readString(value.alertDispatchId),
    notificationDeliveryAttemptId,
    incidentId: readString(value.incidentId),
    tripId: readNullableString(value.tripId),
    emergencyContactId: readString(value.emergencyContactId),
    status: readString(value.status, "Pending"),
    responseType: readString(value.responseType, "Pending"),
    message: readNullableString(value.message),
    viewedAtUtc: readNullableString(value.viewedAtUtc),
    acknowledgedAtUtc: readNullableString(value.acknowledgedAtUtc),
    declinedAtUtc: readNullableString(value.declinedAtUtc),
    createdAtUtc: readString(value.createdAtUtc, new Date().toISOString()),
    updatedAtUtc: readNullableString(value.updatedAtUtc),
  };
}

function unwrapAlert(value: unknown): MonitorAlert {
  const source = isRecord(value) && isRecord(value.acknowledgement) ? value.acknowledgement : value;
  const alert = readAlert(source);

  if (!alert) {
    throw new Error("No pudimos leer la alerta devuelta por MotoSOS.");
  }

  return alert;
}

function createDemoMonitorAlert(overrides: Partial<MonitorAlert> = {}): MonitorAlert {
  const createdAtUtc = new Date(Date.now() - 7 * 60 * 1000).toISOString();

  return {
    id: DEMO_MONITOR_ALERT_ID,
    alertDispatchId: "DEMO-MONITOR-DISPATCH-001",
    notificationDeliveryAttemptId: DEMO_MONITOR_ALERT_ID,
    incidentId: DEMO_MONITOR_INCIDENT_ID,
    tripId: "demo-monitor-trip",
    emergencyContactId: "DEMO-CONTACT-001",
    status: "Pending",
    responseType: "Pending",
    message: null,
    viewedAtUtc: null,
    acknowledgedAtUtc: null,
    declinedAtUtc: null,
    createdAtUtc,
    updatedAtUtc: null,
    ...overrides,
  };
}

function readStoredDemoMonitorAlert(): MonitorAlert {
  if (typeof window === "undefined") {
    return memoryDemoMonitorAlert ?? createDemoMonitorAlert();
  }

  try {
    const raw = window.sessionStorage.getItem(DEMO_MONITOR_ALERT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const alert = readAlert(parsed);
    return alert ?? createDemoMonitorAlert();
  } catch {
    return createDemoMonitorAlert();
  }
}

function saveDemoMonitorAlert(alert: MonitorAlert): MonitorAlert {
  if (typeof window === "undefined") {
    memoryDemoMonitorAlert = alert;
    return alert;
  }

  window.sessionStorage.setItem(DEMO_MONITOR_ALERT_KEY, JSON.stringify(alert));
  return alert;
}

export function createDemoMonitorDashboardAlert(): MonitorAlert {
  return readStoredDemoMonitorAlert();
}

export async function getMonitorAlert(notificationDeliveryAttemptId: string): Promise<MonitorAlert> {
  if (notificationDeliveryAttemptId === DEMO_MONITOR_ALERT_ID) {
    return readStoredDemoMonitorAlert();
  }

  const response = await api.get<ApiResponse<unknown>>(`/api/v1/monitor/alerts/${encodeURIComponent(notificationDeliveryAttemptId)}`);
  return unwrapAlert(unwrap<unknown>(response));
}

export async function getMonitorAlertDetails(notificationDeliveryAttemptId: string): Promise<MonitorAlertDetails> {
  const alert = await getMonitorAlert(notificationDeliveryAttemptId);

  try {
    const status = await getMonitorEmergencyStatus(notificationDeliveryAttemptId);
    return { alert, status };
  } catch {
    return { alert, status: null };
  }
}

export async function markMonitorAlertViewed(notificationDeliveryAttemptId: string): Promise<MonitorAlert> {
  if (notificationDeliveryAttemptId === DEMO_MONITOR_ALERT_ID) {
    const now = new Date().toISOString();
    return saveDemoMonitorAlert(createDemoMonitorAlert({ status: "Viewed", responseType: "Viewed", viewedAtUtc: now, updatedAtUtc: now }));
  }

  const response = await api.post<ApiResponse<unknown>>(`/api/v1/monitor/alerts/${encodeURIComponent(notificationDeliveryAttemptId)}/view`);
  return unwrapAlert(unwrap<unknown>(response));
}

export async function acknowledgeMonitorAlert(notificationDeliveryAttemptId: string, message: string): Promise<MonitorAlert> {
  if (notificationDeliveryAttemptId === DEMO_MONITOR_ALERT_ID) {
    const now = new Date().toISOString();
    return saveDemoMonitorAlert(
      createDemoMonitorAlert({
        status: "Acknowledged",
        responseType: "CanAssist",
        message: message.trim().slice(0, 300) || "Puedo apoyar con esta emergencia.",
        viewedAtUtc: now,
        acknowledgedAtUtc: now,
        updatedAtUtc: now,
      }),
    );
  }

  const response = await api.post<ApiResponse<unknown>>(
    `/api/v1/monitor/alerts/${encodeURIComponent(notificationDeliveryAttemptId)}/acknowledge`,
    {
      responseType: "CanAssist",
      message: message.trim().slice(0, 300),
    },
  );
  return unwrapAlert(unwrap<unknown>(response));
}

export async function declineMonitorAlert(notificationDeliveryAttemptId: string, message: string): Promise<MonitorAlert> {
  if (notificationDeliveryAttemptId === DEMO_MONITOR_ALERT_ID) {
    const now = new Date().toISOString();
    return saveDemoMonitorAlert(
      createDemoMonitorAlert({
        status: "Declined",
        responseType: "CannotAssist",
        message: message.trim().slice(0, 300) || "No puedo apoyar en este momento.",
        viewedAtUtc: now,
        declinedAtUtc: now,
        updatedAtUtc: now,
      }),
    );
  }

  const response = await api.post<ApiResponse<unknown>>(
    `/api/v1/monitor/alerts/${encodeURIComponent(notificationDeliveryAttemptId)}/decline`,
    {
      responseType: "CannotAssist",
      message: message.trim().slice(0, 300),
    },
  );
  return unwrapAlert(unwrap<unknown>(response));
}
