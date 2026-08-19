import type { IncidentRecord } from "../types/incident";
import type { ApiResponse } from "../types/auth";
import type {
  DashboardIncident,
  DashboardMetric,
  DashboardServiceResponse,
  DashboardStatusFilter,
  DashboardSummary,
} from "../types/dashboard";
import { ApiRequestError, api, unwrap } from "./api";
import { createSimulatedIncident, getIncidents } from "./incidentService";
import { createDemoMonitorDashboardAlert } from "./monitorAlertService";
import { getSession } from "./sessionService";
import { getApiErrorMessage } from "../utils/apiErrors";

const allIncidentFilters = {
  search: "",
  status: "all",
  severity: "all",
  origin: "all",
  dateFrom: "",
  dateTo: "",
  sortBy: "newest",
} as const;

function toDashboardIncident(incident: IncidentRecord): DashboardIncident {
  return {
    id: incident.id,
    folio: incident.folio,
    tripId: incident.tripId,
    alertDispatchId: null,
    notificationDeliveryAttemptId: null,
    driverName: incident.driver.fullName,
    vehicleAlias: incident.vehicle.alias,
    vehicleDescription: `${incident.vehicle.brand} ${incident.vehicle.model}, ${incident.vehicle.year}`,
    licensePlateMasked: incident.vehicle.licensePlateMasked,
    incidentType: incident.incidentType,
    status: incident.status,
    severity: incident.severity,
    occurredAt: incident.occurredAt,
    locationLabel: incident.locationLabel,
    coordinates: incident.coordinates,
    elapsedMinutes: incident.elapsedMinutes,
    batteryLevel: incident.device.mobileBatteryLevel,
    signalStatus: incident.device.signalStatus,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readMonitorAlerts(value: unknown): Record<string, unknown>[] {
  if (!isRecord(value)) {
    return [];
  }

  const alerts = value.alerts ?? value.items ?? value.acknowledgements;
  return Array.isArray(alerts) ? alerts.filter(isRecord) : [];
}

function isMonitorWithoutLinkedContacts(error: unknown): boolean {
  return error instanceof ApiRequestError && error.message.toLowerCase().includes("no linked emergency contacts");
}

function normalizeMonitorStatus(value: unknown): DashboardIncident["status"] {
  switch (readString(value).toLowerCase()) {
    case "acknowledged":
      return "acknowledged";
    case "viewed":
      return "in_progress";
    case "declined":
      return "cancelled";
    case "resolved":
    case "closed":
      return "resolved";
    default:
      return "active";
  }
}

function toMonitorDashboardIncident(alert: Record<string, unknown>): DashboardIncident | null {
  const id = readString(alert.incidentId) || readString(alert.notificationDeliveryAttemptId) || readString(alert.id);
  const notificationDeliveryAttemptId = readString(alert.notificationDeliveryAttemptId, readString(alert.id));

  if (!id || !notificationDeliveryAttemptId) {
    return null;
  }

  const occurredAt = readString(alert.createdAtUtc, new Date().toISOString());
  const elapsedMinutes = Math.max(Math.floor((Date.now() - new Date(occurredAt).getTime()) / 60000), 0);

  return {
    id,
    folio: id,
    tripId: readString(alert.tripId) || null,
    alertDispatchId: readString(alert.alertDispatchId) || null,
    notificationDeliveryAttemptId,
    driverName: "Conductor MotoSOS",
    vehicleAlias: "Vehículo monitoreado",
    vehicleDescription: "Información disponible al abrir la alerta",
    licensePlateMasked: "No disponible",
    incidentType: "Alerta de emergencia",
    status: normalizeMonitorStatus(alert.status),
    severity: "critical",
    occurredAt,
    locationLabel: "Ubicación disponible en la alerta",
    coordinates: { latitude: 19.4326, longitude: -99.1332 },
    elapsedMinutes,
    batteryLevel: null,
    signalStatus: "medium",
  };
}

function createMonitorDemoDashboardIncident(): DashboardIncident {
  const alert = createDemoMonitorDashboardAlert();
  const occurredAt = alert.createdAtUtc;
  const elapsedMinutes = Math.max(Math.floor((Date.now() - new Date(occurredAt).getTime()) / 60000), 0);

  return {
    id: alert.incidentId,
    folio: alert.incidentId,
    tripId: alert.tripId,
    alertDispatchId: alert.alertDispatchId,
    notificationDeliveryAttemptId: alert.notificationDeliveryAttemptId,
    driverName: "Conductor demo",
    vehicleAlias: "Vehículo monitoreado",
    vehicleDescription: "MotoSOS Demo",
    licensePlateMasked: "DEM-***",
    incidentType: "Alerta demo de monitor",
    status: normalizeMonitorStatus(alert.status),
    severity: "critical",
    occurredAt,
    locationLabel: "Ubicación demo compartida",
    coordinates: { latitude: 19.4326, longitude: -99.1332 },
    elapsedMinutes,
    batteryLevel: 76,
    signalStatus: "strong",
  };
}

function calculateMetrics(incidents: IncidentRecord[]): DashboardMetric[] {
  return [
    {
      id: "active",
      label: "Incidentes activos",
      value: incidents.filter((incident) => incident.status === "active").length,
      comparisonText: "1 más que ayer",
      trend: "up",
    },
    {
      id: "in_progress",
      label: "En seguimiento",
      value: incidents.filter((incident) => incident.status === "in_progress" || incident.status === "acknowledged").length,
      comparisonText: "Sin cambios desde ayer",
      trend: "neutral",
    },
    {
      id: "resolved",
      label: "Resueltos hoy",
      value: incidents.filter((incident) => incident.status === "resolved").length,
      comparisonText: "2 menos que ayer",
      trend: "down",
    },
    {
      id: "critical",
      label: "Alertas críticas",
      value: incidents.filter(
        (incident) => incident.severity === "critical" && incident.status !== "resolved" && incident.status !== "cancelled",
      ).length,
      comparisonText: "1 requiere atención",
      trend: "up",
    },
  ];
}

async function buildSummary(): Promise<DashboardSummary> {
  const session = getSession();

  if (session?.role === "administrador") {
    const [summaryResponse, incidentsResponse] = await Promise.all([
      api.get<ApiResponse<unknown>>("/api/v1/admin/dashboard/summary"),
      api.get<ApiResponse<unknown>>("/api/v1/admin/dashboard/incidents", { params: { pageNumber: 1, pageSize: 100 } }),
    ]);
    const summary = unwrap<unknown>(summaryResponse);
    const incidentsPayload = unwrap<unknown>(incidentsResponse);
    const incidentItems = readMonitorAlerts(incidentsPayload)
      .map(toAdminDashboardIncident)
      .filter((item): item is DashboardIncident => Boolean(item));

    return {
      metrics: calculateAdminMetrics(summary, incidentItems),
      incidents: incidentItems,
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  if (session?.role === "monitor") {
    let incidents: DashboardIncident[] = [];

    try {
      const response = await api.get<ApiResponse<unknown>>("/api/v1/monitor/alerts", { params: { pageNumber: 1, pageSize: 100 } });
      incidents = readMonitorAlerts(unwrap<unknown>(response))
        .map(toMonitorDashboardIncident)
        .filter((incident): incident is DashboardIncident => Boolean(incident));
    } catch (error) {
      if (!isMonitorWithoutLinkedContacts(error)) {
        throw error;
      }
    }

    if (incidents.length === 0) {
      incidents = [createMonitorDemoDashboardIncident()];
    }

    return {
      metrics: calculateDashboardMetrics(incidents),
      incidents,
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  const response = await getIncidents(allIncidentFilters, { page: 1, pageSize: 100 }, session);

  if (!response.success || !response.data) {
    throw new Error(response.message || "No pudimos cargar el dashboard");
  }

  const incidents = response.data.items.length > 0 ? response.data.items : [createSimulatedIncident(session)];

  return {
    metrics: calculateMetrics(incidents),
    incidents: incidents.map(toDashboardIncident),
    lastUpdatedAt: new Date().toISOString(),
  };
}

function normalizeAdminStatus(value: unknown): DashboardIncident["status"] {
  switch (readString(value).toLowerCase()) {
    case "closed":
    case "resolved":
      return "resolved";
    case "falsepositivecancelled":
    case "false_positive_cancelled":
    case "cancelled":
      return "cancelled";
    default:
      return "active";
  }
}

function normalizeAdminSeverity(value: unknown): DashboardIncident["severity"] {
  switch (readString(value).toLowerCase()) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "low":
      return "low";
    default:
      return "medium";
  }
}

function toAdminDashboardIncident(item: Record<string, unknown>): DashboardIncident | null {
  const incidentId = readString(item.incidentId, readString(item.id));

  if (!incidentId) {
    return null;
  }

  const occurredAt = readString(item.occurredAtUtc, readString(item.createdAtUtc, new Date().toISOString()));
  const elapsedMinutes = Math.max(Math.floor((Date.now() - new Date(occurredAt).getTime()) / 60000), 0);

  return {
    id: incidentId,
    folio: incidentId,
    tripId: readString(item.tripId) || null,
    alertDispatchId: null,
    notificationDeliveryAttemptId: null,
    driverName: "Usuario MotoSOS",
    vehicleAlias: "Vehículo registrado",
    vehicleDescription: "Detalle restringido para administración",
    licensePlateMasked: "Protegida",
    incidentType: readString(item.cause, "Incidente"),
    status: normalizeAdminStatus(item.status),
    severity: normalizeAdminSeverity(item.riskLevel),
    occurredAt,
    locationLabel: "Ubicación protegida",
    coordinates: { latitude: 19.4326, longitude: -99.1332 },
    elapsedMinutes,
    batteryLevel: null,
    signalStatus: "medium",
  };
}

function calculateAdminMetrics(summary: unknown, incidents: DashboardIncident[]): DashboardMetric[] {
  const summaryRecord = isRecord(summary) ? summary : {};
  const incidentsSummary = isRecord(summaryRecord.incidents) ? summaryRecord.incidents : {};
  const alertsSummary = isRecord(summaryRecord.alerts) ? summaryRecord.alerts : {};
  const open = readNumber(incidentsSummary.open, incidents.filter((incident) => incident.status === "active").length);
  const closed = readNumber(incidentsSummary.closed, incidents.filter((incident) => incident.status === "resolved").length);
  const alertsPending = readNumber(alertsSummary.pendingDispatch);
  const critical = incidents.filter((incident) => incident.severity === "critical" || incident.severity === "high").length;

  return [
    { id: "active", label: "Incidentes abiertos", value: open, comparisonText: "Casos operativos", trend: "neutral" },
    { id: "in_progress", label: "Alertas pendientes", value: alertsPending, comparisonText: "Dispatch pendiente", trend: "neutral" },
    { id: "resolved", label: "Cerrados", value: closed, comparisonText: "Histórico operativo", trend: "neutral" },
    { id: "critical", label: "Prioridad alta", value: critical, comparisonText: "Riesgo alto o crítico", trend: "neutral" },
  ];
}

function calculateDashboardMetrics(incidents: DashboardIncident[]): DashboardMetric[] {
  return [
    {
      id: "active",
      label: "Alertas pendientes",
      value: incidents.filter((incident) => incident.status === "active").length,
      comparisonText: "Sin responder todavía",
      trend: "neutral",
    },
    {
      id: "in_progress",
      label: "En seguimiento",
      value: incidents.filter((incident) => incident.status === "in_progress" || incident.status === "acknowledged").length,
      comparisonText: "Alertas vistas o aceptadas",
      trend: "neutral",
    },
    {
      id: "resolved",
      label: "Alertas cerradas",
      value: incidents.filter((incident) => incident.status === "resolved").length,
      comparisonText: "Casos cerrados",
      trend: "neutral",
    },
    {
      id: "critical",
      label: "Prioridad alta",
      value: incidents.filter(
        (incident) => incident.severity === "critical" && incident.status !== "resolved" && incident.status !== "cancelled",
      ).length,
      comparisonText: "Requieren atención",
      trend: "neutral",
    },
  ];
}

export async function getDashboardSummary(): Promise<DashboardServiceResponse<DashboardSummary>> {
  try {
    const summary = await buildSummary();
    return { success: true, message: "Resumen obtenido correctamente", data: summary };
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error), data: null };
  }
}

export async function refreshDashboardSummary(): Promise<DashboardServiceResponse<DashboardSummary>> {
  try {
    const summary = await buildSummary();
    return { success: true, message: "Dashboard actualizado correctamente", data: summary };
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error), data: null };
  }
}

export function filterDashboardIncidents(filter: DashboardStatusFilter, incidents: DashboardIncident[] = []): DashboardIncident[] {
  if (filter === "all") {
    return incidents;
  }
  if (filter === "critical") {
    return incidents.filter((incident) => incident.severity === "critical");
  }
  if (filter === "in_progress") {
    return incidents.filter((incident) => incident.status === "in_progress" || incident.status === "acknowledged");
  }
  return incidents.filter((incident) => incident.status === filter);
}
