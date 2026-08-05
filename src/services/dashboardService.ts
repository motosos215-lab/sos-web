import type { IncidentRecord } from "../types/incident";
import type {
  DashboardIncident,
  DashboardMetric,
  DashboardServiceResponse,
  DashboardStatusFilter,
  DashboardSummary,
} from "../types/dashboard";
import { getStoredIncidents } from "./incidentStorageService";

// Servicio temporal de resumen operativo. En producción leerá endpoints backend de dashboard/incidentes.
let refreshCount = 0;

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

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

function calculateMetrics(incidents: IncidentRecord[]): DashboardMetric[] {
  return [
    { id: "active", label: "Incidentes activos", value: incidents.filter((incident) => incident.status === "active").length, comparisonText: "1 más que ayer", trend: "up" },
    { id: "in_progress", label: "En seguimiento", value: incidents.filter((incident) => incident.status === "in_progress" || incident.status === "acknowledged").length, comparisonText: "Sin cambios desde ayer", trend: "neutral" },
    { id: "resolved", label: "Resueltos hoy", value: incidents.filter((incident) => incident.status === "resolved").length, comparisonText: "2 menos que ayer", trend: "down" },
    { id: "critical", label: "Alertas críticas", value: incidents.filter((incident) => incident.severity === "critical" && incident.status !== "resolved" && incident.status !== "cancelled").length, comparisonText: "1 requiere atención", trend: "up" },
  ];
}

function buildSummary(): DashboardSummary {
  const incidents = getStoredIncidents();
  return {
    metrics: calculateMetrics(incidents),
    incidents: incidents.map(toDashboardIncident),
    lastUpdatedAt: new Date(Date.now() + refreshCount * 1000).toISOString(),
  };
}

export async function getDashboardSummary(): Promise<DashboardServiceResponse<DashboardSummary>> {
  await wait(650);
  return { success: true, message: "Resumen obtenido correctamente", data: buildSummary() };
}

export async function refreshDashboardSummary(): Promise<DashboardServiceResponse<DashboardSummary>> {
  await wait(700);
  refreshCount += 1;
  return { success: true, message: "Dashboard actualizado correctamente", data: buildSummary() };
}

export function filterDashboardIncidents(filter: DashboardStatusFilter, incidents: DashboardIncident[] = buildSummary().incidents): DashboardIncident[] {
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
