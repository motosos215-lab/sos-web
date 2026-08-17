import type { ApiResponse } from "../types/auth";
import type { SimulatedSession } from "./sessionService";
import type {
  IncidentActor,
  IncidentCallData,
  IncidentCloseData,
  IncidentFilters,
  IncidentMessageData,
  IncidentNotifyData,
  IncidentPagination,
  IncidentRecord,
  IncidentResolution,
  IncidentSeverity,
  IncidentStatus,
  IncidentTimelineEntry,
  PaginatedIncidentResult,
  ServiceResult,
} from "../types/incident";
import { api, unwrap } from "./api";
import { getApiErrorMessage } from "../utils/apiErrors";

type IncidentApiRecord = Record<string, unknown>;

const severityRank: Record<IncidentSeverity, number> = { critical: 4, high: 3, medium: 2, low: 1 };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeStatus(value: unknown): IncidentStatus {
  switch (readString(value).toLowerCase()) {
    case "open":
    case "active":
      return "active";
    case "falsepositivecancelled":
    case "false_positive_cancelled":
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "closed":
    case "resolved":
      return "resolved";
    case "acknowledged":
      return "acknowledged";
    case "inprogress":
    case "in_progress":
      return "in_progress";
    default:
      return "active";
  }
}

function normalizeSeverity(value: unknown): IncidentSeverity {
  switch (readString(value).toLowerCase()) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "medium":
      return "medium";
    case "low":
      return "low";
    default:
      return "medium";
  }
}

function normalizeOrigin(value: unknown): IncidentRecord["origin"] {
  const normalized = readString(value).toLowerCase();
  return normalized.includes("manual") || normalized.includes("sos") ? "manual_sos" : "automatic_detection";
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return local && domain ? `${local.slice(0, 2)}***@${domain}` : "No disponible";
}

function readIncidentPayload(value: unknown): IncidentApiRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  return isRecord(value.incident) ? value.incident : value;
}

function readIncidentList(value: unknown): IncidentApiRecord[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }

  if (!isRecord(value)) {
    return [];
  }

  const candidates = [value.incidents, value.items, value.results];
  const list = candidates.find(Array.isArray);
  return Array.isArray(list) ? list.filter(isRecord) : [];
}

function makeTimeline(record: IncidentApiRecord, status: IncidentStatus, occurredAt: string): IncidentTimelineEntry[] {
  const entries: IncidentTimelineEntry[] = [
    {
      id: `${readString(record.id, "incident")}-created`,
      actionType: "created",
      title: "Incidente registrado",
      description: "MotoSOS registró el incidente en el backend.",
      occurredAt,
      performedBy: null,
      performedRole: null,
    },
  ];

  const closedAt = readString(record.closedAtUtc);
  const cancelledAt = readString(record.cancelledAtUtc);

  if (status === "cancelled" && cancelledAt) {
    entries.push({
      id: `${readString(record.id, "incident")}-cancelled`,
      actionType: "cancelled",
      title: "Falso positivo cancelado",
      description: "El conductor canceló la alerta como falso positivo.",
      occurredAt: cancelledAt,
      performedBy: "Conductor",
      performedRole: "Rider",
    });
  }

  if (status === "resolved" && closedAt) {
    entries.push({
      id: `${readString(record.id, "incident")}-closed`,
      actionType: "closed",
      title: "Caso cerrado",
      description: readString(record.closureNotes, "El incidente fue cerrado."),
      occurredAt: closedAt,
      performedBy: "Conductor",
      performedRole: "Rider",
    });
  }

  return entries;
}

function toClosure(record: IncidentApiRecord, status: IncidentStatus): IncidentRecord["closure"] {
  if (status !== "resolved" && status !== "cancelled") {
    return null;
  }

  const closedAt = readString(record.closedAtUtc) || readString(record.cancelledAtUtc) || new Date().toISOString();
  const resolution: IncidentResolution = status === "cancelled" ? "false_positive" : "assistance_provided";

  return {
    resolution,
    notes: readString(record.closureNotes, status === "cancelled" ? "Falso positivo cancelado" : "Caso cerrado"),
    closedAt,
    closedBy: "Conductor",
    closedByRole: "Rider",
  };
}

function toIncidentRecord(record: IncidentApiRecord, session: SimulatedSession | null): IncidentRecord | null {
  const id = readString(record.id);

  if (!id) {
    return null;
  }

  const status = normalizeStatus(record.status);
  const severity = normalizeSeverity(record.riskLevel ?? record.severity);
  const origin = normalizeOrigin(record.source ?? record.cause);
  const occurredAt = readString(record.occurredAtUtc, readString(record.createdAtUtc, new Date().toISOString()));
  const location = isRecord(record.location) ? record.location : {};
  const evidence = isRecord(record.evidenceSummary) ? record.evidenceSummary : {};
  const elapsedMinutes = Math.max(Math.floor((Date.now() - new Date(occurredAt).getTime()) / 60000), 0);
  const latitude = readNumber(location.latitude, 19.4326);
  const longitude = readNumber(location.longitude, -99.1332);

  return {
    id,
    folio: id,
    ownerUserId: session?.userId ?? "",
    driver: {
      id: session?.userId ?? "",
      fullName: session?.name ?? "Usuario MotoSOS",
      phoneMasked: "No disponible",
      emailMasked: maskEmail(session?.email ?? ""),
      bloodType: null,
      city: "No disponible",
    },
    vehicle: {
      id: readString(record.vehicleId, "vehicle"),
      alias: "Motocicleta",
      type: "motocicleta",
      brand: "MotoSOS",
      model: "Vehículo registrado",
      year: new Date().getFullYear(),
      licensePlateMasked: "No disponible",
    },
    device: {
      mobileBatteryLevel: typeof evidence.phoneBatteryPercent === "number" ? evidence.phoneBatteryPercent : null,
      smartwatchBatteryLevel: typeof evidence.watchBatteryPercent === "number" ? evidence.watchBatteryPercent : null,
      signalStatus: "strong",
      gpsAccuracyMeters: typeof location.accuracyMeters === "number" ? location.accuracyMeters : null,
      lastSynchronization: readString(record.updatedAtUtc) || readString(record.createdAtUtc) || occurredAt,
    },
    contacts: [],
    status,
    severity,
    origin,
    incidentType: readString(record.cause, origin === "manual_sos" ? "SOS manual" : "Detección móvil"),
    occurredAt,
    acknowledgedAt: null,
    closedAt: readString(record.closedAtUtc) || readString(record.cancelledAtUtc) || null,
    locationLabel: latitude && longitude ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` : "Ubicación no disponible",
    coordinates: { latitude, longitude },
    estimatedDistanceKm: null,
    elapsedMinutes,
    description: readString(record.closureNotes, "Incidente registrado por MotoSOS."),
    assignedMonitorName: null,
    locationSharingAllowed: false,
    monitorCanClose: false,
    timeline: makeTimeline(record, status, occurredAt),
    closure: toClosure(record, status),
  };
}

function applyFilters(incidents: IncidentRecord[], filters: IncidentFilters): IncidentRecord[] {
  const search = filters.search.trim().toLowerCase();
  const fromTime = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`).getTime() : null;
  const toTime = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`).getTime() : null;

  return incidents
    .filter(
      (incident) =>
        !search ||
        [incident.folio, incident.driver.fullName, incident.vehicle.alias, incident.incidentType].some((value) =>
          value.toLowerCase().includes(search),
        ),
    )
    .filter((incident) => filters.status === "all" || incident.status === filters.status)
    .filter((incident) => filters.severity === "all" || incident.severity === filters.severity)
    .filter((incident) => filters.origin === "all" || incident.origin === filters.origin)
    .filter((incident) => {
      const occurredAt = new Date(incident.occurredAt).getTime();
      return (fromTime === null || occurredAt >= fromTime) && (toTime === null || occurredAt <= toTime);
    })
    .sort((left, right) => {
      if (filters.sortBy === "oldest") {
        return new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime();
      }
      if (filters.sortBy === "severity") {
        return (
          severityRank[right.severity] - severityRank[left.severity] ||
          new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
        );
      }
      return new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime();
    });
}

async function fetchIncidents(session: SimulatedSession | null): Promise<IncidentRecord[]> {
  const response = await api.get<ApiResponse<unknown>>("/api/v1/incidents", { params: { pageNumber: 1, pageSize: 100 } });
  return readIncidentList(unwrap<unknown>(response))
    .map((item) => toIncidentRecord(item, session))
    .filter((item): item is IncidentRecord => Boolean(item));
}

export async function getIncidents(
  filters: IncidentFilters,
  pagination: IncidentPagination,
  session: SimulatedSession | null,
): Promise<ServiceResult<PaginatedIncidentResult>> {
  try {
    const filtered = applyFilters(await fetchIncidents(session), filters);
    const totalPages = Math.max(Math.ceil(filtered.length / pagination.pageSize), 1);
    const currentPage = Math.min(Math.max(pagination.page, 1), totalPages);
    const start = (currentPage - 1) * pagination.pageSize;

    return {
      success: true,
      message: "Incidentes obtenidos correctamente",
      data: {
        items: filtered.slice(start, start + pagination.pageSize),
        totalItems: filtered.length,
        totalPages,
        currentPage,
        pageSize: pagination.pageSize,
      },
    };
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error), data: null };
  }
}

export async function getIncidentById(incidentId: string, session: SimulatedSession | null): Promise<ServiceResult<IncidentRecord>> {
  try {
    const response = await api.get<ApiResponse<unknown>>(`/api/v1/incidents/${encodeURIComponent(incidentId)}`);
    const incident = toIncidentRecord(readIncidentPayload(unwrap<unknown>(response)) ?? {}, session);
    return incident
      ? { success: true, message: "Incidente obtenido correctamente", data: incident }
      : { success: false, message: "Incidente no encontrado", data: null };
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error), data: null };
  }
}

function unsupportedAction(): ServiceResult<IncidentRecord> {
  return { success: false, message: "Esta acción todavía no tiene endpoint real disponible", data: null };
}

export async function acknowledgeIncident(..._args: unknown[]): Promise<ServiceResult<IncidentRecord>> {
  return unsupportedAction();
}

export async function registerIncidentCall(
  _incidentId: string,
  _data: IncidentCallData,
  _actor: IncidentActor,
  _session: SimulatedSession | null,
): Promise<ServiceResult<IncidentRecord>> {
  return unsupportedAction();
}

export async function registerIncidentMessage(
  _incidentId: string,
  _data: IncidentMessageData,
  _actor: IncidentActor,
  _session: SimulatedSession | null,
): Promise<ServiceResult<IncidentRecord>> {
  return unsupportedAction();
}

export async function shareIncidentLocation(..._args: unknown[]): Promise<ServiceResult<IncidentRecord>> {
  return unsupportedAction();
}

export async function notifyIncidentContacts(
  _incidentId: string,
  _data: IncidentNotifyData,
  _actor: IncidentActor,
  _session: SimulatedSession | null,
): Promise<ServiceResult<IncidentRecord>> {
  return unsupportedAction();
}

export async function startIncidentFollowUp(..._args: unknown[]): Promise<ServiceResult<IncidentRecord>> {
  return unsupportedAction();
}

export async function markDriverSafe(
  incidentId: string,
  _actor: IncidentActor,
  session: SimulatedSession | null,
): Promise<ServiceResult<IncidentRecord>> {
  try {
    const response = await api.post<ApiResponse<unknown>>(`/api/v1/incidents/${encodeURIComponent(incidentId)}/cancel-false-positive`, {
      reason: "Estoy bien",
      cancelledAtUtc: new Date().toISOString(),
    });
    const incident = toIncidentRecord(readIncidentPayload(unwrap<unknown>(response)) ?? {}, session);
    return incident
      ? { success: true, message: "El incidente fue cancelado como falso positivo", data: incident }
      : { success: false, message: "No pudimos actualizar el incidente", data: null };
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error), data: null };
  }
}

export async function closeIncident(
  incidentId: string,
  data: IncidentCloseData,
  _actor: IncidentActor,
  session: SimulatedSession | null,
): Promise<ServiceResult<IncidentRecord>> {
  try {
    const response = await api.post<ApiResponse<unknown>>(`/api/v1/incidents/${encodeURIComponent(incidentId)}/close`, {
      closureReason: data.resolution === "false_positive" ? "FalsePositive" : "Resolved",
      closureNotes: data.notes.trim(),
      closedAtUtc: new Date().toISOString(),
    });
    const incident = toIncidentRecord(readIncidentPayload(unwrap<unknown>(response)) ?? {}, session);
    return incident
      ? { success: true, message: "Incidente cerrado correctamente", data: incident }
      : { success: false, message: "No pudimos cerrar el incidente", data: null };
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error), data: null };
  }
}

export async function refreshIncident(incidentId: string, session: SimulatedSession | null): Promise<ServiceResult<IncidentRecord>> {
  return getIncidentById(incidentId, session);
}

export async function getIncidentTimeline(
  incidentId: string,
  session: SimulatedSession | null,
): Promise<ServiceResult<IncidentTimelineEntry[]>> {
  const response = await getIncidentById(incidentId, session);
  return response.success && response.data
    ? { success: true, message: "Bitácora obtenida correctamente", data: response.data.timeline }
    : { success: false, message: response.message, data: null };
}
