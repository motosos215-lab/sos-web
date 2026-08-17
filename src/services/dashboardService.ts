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
import { getIncidents } from "./incidentService";
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

  if (!id) {
    return null;
  }

  const occurredAt = readString(alert.createdAtUtc, new Date().toISOString());
  const elapsedMinutes = Math.max(Math.floor((Date.now() - new Date(occurredAt).getTime()) / 60000), 0);

  return {
    id,
    folio: id,
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

  const incidents = response.data?.items ?? [];

  return {
    metrics: calculateMetrics(incidents),
    incidents: incidents.map(toDashboardIncident),
    lastUpdatedAt: new Date().toISOString(),
  };
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
