import type { ApiResponse } from "../types/auth";
import { api, unwrap } from "./api";

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  criticalAlertsEnabled: boolean;
  tripUpdatesEnabled: boolean;
  securityAlertsEnabled: boolean;
  marketingEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStartLocal: string | null;
  quietHoursEndLocal: string | null;
  timeZone: string;
}

export interface NotificationAttempt {
  id: string;
  incidentId: string;
  contactFullName: string;
  channel: string;
  status: string;
  provider: string;
  preparedAtUtc: string;
  lastStatusChangedAtUtc: string;
}

const defaultPreferences: NotificationPreferences = {
  pushEnabled: true,
  emailEnabled: false,
  smsEnabled: false,
  criticalAlertsEnabled: true,
  tripUpdatesEnabled: true,
  securityAlertsEnabled: true,
  marketingEnabled: false,
  quietHoursEnabled: false,
  quietHoursStartLocal: null,
  quietHoursEndLocal: null,
  timeZone: "America/Mexico_City",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function toPreferences(value: unknown): NotificationPreferences {
  const source = isRecord(value) && isRecord(value.preferences) ? value.preferences : value;
  const record = isRecord(source) ? source : {};

  return {
    pushEnabled: readBoolean(record.pushEnabled, defaultPreferences.pushEnabled),
    emailEnabled: readBoolean(record.emailEnabled, defaultPreferences.emailEnabled),
    smsEnabled: readBoolean(record.smsEnabled, defaultPreferences.smsEnabled),
    criticalAlertsEnabled: readBoolean(record.criticalAlertsEnabled, defaultPreferences.criticalAlertsEnabled),
    tripUpdatesEnabled: readBoolean(record.tripUpdatesEnabled, defaultPreferences.tripUpdatesEnabled),
    securityAlertsEnabled: readBoolean(record.securityAlertsEnabled, defaultPreferences.securityAlertsEnabled),
    marketingEnabled: readBoolean(record.marketingEnabled, defaultPreferences.marketingEnabled),
    quietHoursEnabled: readBoolean(record.quietHoursEnabled, defaultPreferences.quietHoursEnabled),
    quietHoursStartLocal: readNullableString(record.quietHoursStartLocal),
    quietHoursEndLocal: readNullableString(record.quietHoursEndLocal),
    timeZone: readString(record.timeZone, defaultPreferences.timeZone),
  };
}

function readAttempts(value: unknown): NotificationAttempt[] {
  const list =
    isRecord(value) && Array.isArray(value.attempts)
      ? value.attempts
      : isRecord(value) && Array.isArray(value.items)
        ? value.items
        : Array.isArray(value)
          ? value
          : [];

  return list.filter(isRecord).map((item) => ({
    id: readString(item.id, "attempt"),
    incidentId: readString(item.incidentId, ""),
    contactFullName: readString(item.contactFullName, "Contacto"),
    channel: readString(item.channel, "N/A"),
    status: readString(item.status, "N/A"),
    provider: readString(item.provider, "N/A"),
    preparedAtUtc: readString(item.preparedAtUtc, readString(item.createdAtUtc, new Date().toISOString())),
    lastStatusChangedAtUtc: readString(item.lastStatusChangedAtUtc, readString(item.updatedAtUtc, new Date().toISOString())),
  }));
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const response = await api.get<ApiResponse<unknown>>("/api/v1/notification-preferences/me");
  return toPreferences(unwrap<unknown>(response));
}

export async function updateNotificationPreferences(preferences: NotificationPreferences): Promise<NotificationPreferences> {
  const payload: NotificationPreferences = {
    ...preferences,
    quietHoursStartLocal: preferences.quietHoursEnabled ? preferences.quietHoursStartLocal : null,
    quietHoursEndLocal: preferences.quietHoursEnabled ? preferences.quietHoursEndLocal : null,
  };
  const response = await api.put<ApiResponse<unknown>>("/api/v1/notification-preferences/me", payload);
  return toPreferences(unwrap<unknown>(response));
}

export async function getNotificationAttempts(): Promise<NotificationAttempt[]> {
  const response = await api.get<ApiResponse<unknown>>("/api/v1/notifications/delivery-attempts", {
    params: { pageNumber: 1, pageSize: 25 },
  });
  return readAttempts(unwrap<unknown>(response));
}
