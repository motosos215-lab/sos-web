import { canListIncident, getIncidentPermissions } from "../utils/incidentPermissions";
import { getIncidentByFolio, getStoredIncidents, updateStoredIncident } from "./incidentStorageService";
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
  IncidentTimelineEntry,
  PaginatedIncidentResult,
  ServiceResult,
} from "../types/incident";

const severityRank: Record<IncidentRecord["severity"], number> = { critical: 4, high: 3, medium: 2, low: 1 };

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function createTimelineEntry(actionType: IncidentTimelineEntry["actionType"], title: string, description: string, actor: IncidentActor): IncidentTimelineEntry {
  return {
    id: `${actionType}-${Date.now()}`,
    actionType,
    title,
    description,
    occurredAt: new Date().toISOString(),
    performedBy: actor.name,
    performedRole: actor.role,
  };
}

function appendTimeline(incident: IncidentRecord, entry: IncidentTimelineEntry): IncidentRecord {
  const alreadyExists = incident.timeline.some((item) => item.actionType === entry.actionType && item.title === entry.title && item.performedBy === entry.performedBy);
  return alreadyExists ? incident : { ...incident, timeline: [...incident.timeline, entry] };
}

function applyFilters(incidents: IncidentRecord[], filters: IncidentFilters): IncidentRecord[] {
  const search = normalize(filters.search);
  const fromTime = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`).getTime() : null;
  const toTime = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`).getTime() : null;

  return incidents
    .filter((incident) => {
      if (!search) {
        return true;
      }
      return [incident.folio, incident.driver.fullName, incident.vehicle.alias, incident.vehicle.brand, incident.vehicle.model]
        .some((value) => normalize(value).includes(search));
    })
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
        return severityRank[right.severity] - severityRank[left.severity] || new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime();
      }
      return new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime();
    });
}

export async function getIncidents(filters: IncidentFilters, pagination: IncidentPagination, session: SimulatedSession | null): Promise<ServiceResult<PaginatedIncidentResult>> {
  await wait(650);
  const visibleIncidents = getStoredIncidents().filter((incident) => canListIncident(session, incident));
  const filtered = applyFilters(visibleIncidents, filters);
  const pageSize = pagination.pageSize;
  const totalPages = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const currentPage = Math.min(Math.max(pagination.page, 1), totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    success: true,
    message: "Incidentes obtenidos correctamente",
    data: { items: filtered.slice(start, start + pageSize), totalItems: filtered.length, totalPages, currentPage, pageSize },
  };
}

export async function getIncidentById(incidentId: string, session: SimulatedSession | null): Promise<ServiceResult<IncidentRecord>> {
  await wait(550);
  const incident = getIncidentByFolio(incidentId);

  if (!incident || !canListIncident(session, incident)) {
    return { success: false, message: "Incidente no encontrado", data: null };
  }

  return { success: true, message: "Incidente obtenido correctamente", data: incident };
}

export async function acknowledgeIncident(incidentId: string, actor: IncidentActor, session: SimulatedSession | null): Promise<ServiceResult<IncidentRecord>> {
  await wait(700);
  const incident = getIncidentByFolio(incidentId);
  const permissions = getIncidentPermissions(session, incident);
  if (!incident || !permissions.canAcknowledge) {
    return { success: false, message: "No puedes confirmar esta alerta", data: null };
  }
  if (incident.status !== "active") {
    return { success: false, message: "La recepción ya fue confirmada", data: incident };
  }
  const next = appendTimeline({ ...incident, status: "acknowledged", acknowledgedAt: new Date().toISOString() }, createTimelineEntry("acknowledged", "Recepción confirmada", "Se confirmó la recepción de la alerta.", actor));
  return { success: true, message: "Recepción confirmada correctamente", data: updateStoredIncident(next) };
}

export async function registerIncidentCall(incidentId: string, data: IncidentCallData, actor: IncidentActor, session: SimulatedSession | null): Promise<ServiceResult<IncidentRecord>> {
  await wait(650);
  const incident = getIncidentByFolio(incidentId);
  if (!incident || !getIncidentPermissions(session, incident).canRegisterCall) {
    return { success: false, message: "No puedes registrar llamadas para este incidente", data: null };
  }
  const labels: Record<IncidentCallData["result"], string> = { no_answer: "Sin respuesta", successful: "Contacto exitoso", unavailable: "Número no disponible" };
  const note = data.note.trim() ? ` Nota: ${data.note.trim().slice(0, 120)}` : "";
  const next = appendTimeline(incident, createTimelineEntry("call_registered", "Intento de llamada registrado", `${labels[data.result]}.${note}`, actor));
  return { success: true, message: "Intento de llamada registrado", data: updateStoredIncident(next) };
}

export async function registerIncidentMessage(incidentId: string, data: IncidentMessageData, actor: IncidentActor, session: SimulatedSession | null): Promise<ServiceResult<IncidentRecord>> {
  await wait(650);
  const incident = getIncidentByFolio(incidentId);
  if (!incident || !getIncidentPermissions(session, incident).canRegisterMessage) {
    return { success: false, message: "No puedes registrar mensajes para este incidente", data: null };
  }
  const next = appendTimeline(incident, createTimelineEntry("message_registered", "Mensaje registrado", `Mensaje simulado registrado (${data.message.trim().length} caracteres).`, actor));
  return { success: true, message: "Mensaje registrado correctamente", data: updateStoredIncident(next) };
}

export async function shareIncidentLocation(incidentId: string, contactIds: string[], actor: IncidentActor, session: SimulatedSession | null): Promise<ServiceResult<IncidentRecord>> {
  await wait(700);
  const incident = getIncidentByFolio(incidentId);
  if (!incident || !getIncidentPermissions(session, incident).canShareLocation) {
    return { success: false, message: "No puedes compartir ubicación para este incidente", data: null };
  }
  const allowedCount = incident.contacts.filter((contact) => contactIds.includes(contact.id) && contact.invitationStatus === "linked" && contact.canReceiveLocation).length;
  if (allowedCount === 0) {
    return { success: false, message: "No hay contactos autorizados seleccionados", data: incident };
  }
  const next = appendTimeline(incident, createTimelineEntry("location_shared", "Ubicación compartida", `Ubicación compartida con ${allowedCount} contacto(s) autorizado(s).`, actor));
  return { success: true, message: "Ubicación compartida con los contactos autorizados", data: updateStoredIncident(next) };
}

export async function notifyIncidentContacts(incidentId: string, data: IncidentNotifyData, actor: IncidentActor, session: SimulatedSession | null): Promise<ServiceResult<IncidentRecord>> {
  await wait(700);
  const incident = getIncidentByFolio(incidentId);
  if (!incident || !getIncidentPermissions(session, incident).canNotifyContacts) {
    return { success: false, message: "No puedes notificar contactos", data: null };
  }
  const count = incident.contacts.filter((contact) => data.contactIds.includes(contact.id) && contact.invitationStatus === "linked" && contact.canReceiveCriticalAlerts).length;
  if (count === 0) {
    return { success: false, message: "No hay contactos vinculados disponibles", data: incident };
  }
  const next = appendTimeline(incident, createTimelineEntry("contacts_notified", "Contactos notificados", `Se preparó notificación ${data.channel} para ${count} contacto(s).`, actor));
  return { success: true, message: "Contactos notificados correctamente", data: updateStoredIncident(next) };
}

export async function startIncidentFollowUp(incidentId: string, actor: IncidentActor, session: SimulatedSession | null): Promise<ServiceResult<IncidentRecord>> {
  await wait(600);
  const incident = getIncidentByFolio(incidentId);
  if (!incident || !getIncidentPermissions(session, incident).canStartFollowUp || incident.status !== "acknowledged") {
    return { success: false, message: "No puedes marcar este incidente en seguimiento", data: incident };
  }
  const next = appendTimeline({ ...incident, status: "in_progress" }, createTimelineEntry("follow_up_started", "Seguimiento iniciado", "El incidente fue marcado en seguimiento.", actor));
  return { success: true, message: "Incidente marcado en seguimiento", data: updateStoredIncident(next) };
}

export async function markDriverSafe(incidentId: string, actor: IncidentActor, session: SimulatedSession | null): Promise<ServiceResult<IncidentRecord>> {
  await wait(700);
  const incident = getIncidentByFolio(incidentId);
  if (!incident || !getIncidentPermissions(session, incident).canMarkSafe) {
    return { success: false, message: "No puedes actualizar este incidente", data: null };
  }
  const now = new Date().toISOString();
  const closure = { resolution: incident.origin === "automatic_detection" ? "false_positive" as const : "driver_safe" as const, notes: "El conductor indicó que se encuentra bien desde el dashboard.", closedAt: now, closedBy: actor.name, closedByRole: actor.role };
  const next = appendTimeline({ ...incident, status: "resolved", closedAt: now, closure }, createTimelineEntry("driver_marked_safe", "Conductor a salvo", "El conductor indicó que se encuentra bien.", actor));
  return { success: true, message: "El incidente fue actualizado correctamente", data: updateStoredIncident(next) };
}

export async function closeIncident(incidentId: string, data: IncidentCloseData, actor: IncidentActor, session: SimulatedSession | null): Promise<ServiceResult<IncidentRecord>> {
  await wait(800);
  const incident = getIncidentByFolio(incidentId);
  if (!incident || !getIncidentPermissions(session, incident).canCloseIncident || incident.closure) {
    return { success: false, message: "No puedes cerrar este incidente", data: incident };
  }
  const now = new Date().toISOString();
  const closure = { resolution: data.resolution, notes: data.notes.trim(), closedAt: now, closedBy: actor.name, closedByRole: actor.role };
  const next = appendTimeline({ ...incident, status: "resolved", closedAt: now, closure }, createTimelineEntry("closed", "Caso cerrado", "El incidente fue cerrado con resolución documentada.", actor));
  return { success: true, message: "Incidente cerrado correctamente", data: updateStoredIncident(next) };
}

export async function refreshIncident(incidentId: string, session: SimulatedSession | null): Promise<ServiceResult<IncidentRecord>> {
  await wait(500);
  return getIncidentById(incidentId, session);
}

export async function getIncidentTimeline(incidentId: string, session: SimulatedSession | null): Promise<ServiceResult<IncidentTimelineEntry[]>> {
  const response = await getIncidentById(incidentId, session);
  return response.success && response.data
    ? { success: true, message: "Bitácora obtenida correctamente", data: [...response.data.timeline].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()) }
    : { success: false, message: response.message, data: null };
}
