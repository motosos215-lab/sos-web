import type { IncidentActionType, IncidentClosure, IncidentRecord, IncidentTimelineEntry } from "../types/incident";

const INCIDENTS_STORAGE_KEY = "motosos.incidents.shared";
const baseTime = new Date("2026-08-04T18:30:00.000Z").getTime();

function iso(minutesAgo: number): string {
  return new Date(baseTime - minutesAgo * 60 * 1000).toISOString();
}

function timeline(id: string, actionType: IncidentActionType, title: string, description: string, minutesAgo: number): IncidentTimelineEntry {
  return { id, actionType, title, description, occurredAt: iso(minutesAgo), performedBy: null, performedRole: null };
}

function createFixtureIncident(index: number, overrides: Partial<IncidentRecord>): IncidentRecord {
  const folio = `INC-${String(123 + index).padStart(6, "0")}`;
  const defaultIncident: IncidentRecord = {
    id: `incident-demo-${String(index + 1).padStart(3, "0")}`,
    folio,
    ownerUserId: index % 2 === 0 ? "demo-driver-a" : "demo-driver-b",
    driver: {
      id: index % 2 === 0 ? "demo-driver-a" : "demo-driver-b",
      fullName: ["María González", "Luis Herrera", "Ana Torres", "Carlos Mejía"][index % 4],
      phoneMasked: "*******4321",
      emailMasked: "moto****@example.com",
      bloodType: index % 3 === 0 ? "O+" : null,
      city: "Ciudad de México",
    },
    vehicle: {
      id: `vehicle-demo-${index + 1}`,
      alias: ["Mi motocicleta", "Ruta diaria", "Trabajo", "Scooter"][index % 4],
      type: index % 4 === 3 ? "motoneta" : "motocicleta",
      brand: ["Yamaha", "Honda", "Italika", "Suzuki"][index % 4],
      model: ["MT-07", "CB190R", "250Z", "Burgman"][index % 4],
      year: 2020 + (index % 4),
      licensePlateMasked: ["***-745", "***-218", "***-903", "***-511"][index % 4],
    },
    device: {
      mobileBatteryLevel: 78 - index * 4,
      smartwatchBatteryLevel: index % 3 === 0 ? null : 64 - index * 3,
      signalStatus: ["strong", "medium", "weak", "offline"][index % 4] as IncidentRecord["device"]["signalStatus"],
      gpsAccuracyMeters: index % 4 === 3 ? null : 8 + index * 2,
      lastSynchronization: iso(5 + index * 8),
    },
    contacts: [
      {
        id: `contact-demo-${index + 1}-a`,
        fullName: "Laura Pérez",
        relationship: "Familiar",
        phoneMasked: "*******1188",
        invitationStatus: "linked",
        canReceiveLocation: true,
        canReceiveCriticalAlerts: true,
      },
      {
        id: `contact-demo-${index + 1}-b`,
        fullName: "Roberto Díaz",
        relationship: "Amigo",
        phoneMasked: "*******2299",
        invitationStatus: index % 2 === 0 ? "linked" : "invited",
        canReceiveLocation: index % 2 === 0,
        canReceiveCriticalAlerts: true,
      },
    ],
    status: "active",
    severity: "medium",
    origin: "automatic_detection",
    incidentType: "Impacto / caída",
    occurredAt: iso(7 + index * 12),
    acknowledgedAt: null,
    closedAt: null,
    locationLabel: "Av. Insurgentes Sur, Ciudad de México",
    coordinates: { latitude: 19.4326 + index * 0.004, longitude: -99.1332 - index * 0.003 },
    estimatedDistanceKm: 2.4 + index * 0.3,
    elapsedMinutes: 7 + index * 12,
    description: "Alerta operativa generada por MotoSOS con datos simulados para validación del panel.",
    assignedMonitorName: index % 2 === 0 ? "Operador Central" : null,
    locationSharingAllowed: true,
    monitorCanClose: index % 3 !== 1,
    timeline: [timeline(`tl-${index}-created`, "created", "Alerta generada", "El sistema registró una alerta operativa simulada.", 7 + index * 12)],
    closure: null,
  };

  return { ...defaultIncident, ...overrides };
}

function getInitialIncidents(): IncidentRecord[] {
  const incidents = [
    createFixtureIncident(0, {
      folio: "INC-000123",
      severity: "high",
      status: "active",
      origin: "automatic_detection",
      driver: { id: "demo-driver-a", fullName: "María González", phoneMasked: "*******4321", emailMasked: "mari****@example.com", bloodType: "O+", city: "Ciudad de México" },
      vehicle: { id: "vehicle-demo-001", alias: "Mi motocicleta", type: "motocicleta", brand: "Yamaha", model: "MT-07", year: 2023, licensePlateMasked: "***-745" },
      device: { mobileBatteryLevel: 78, smartwatchBatteryLevel: 64, signalStatus: "strong", gpsAccuracyMeters: 8, lastSynchronization: iso(4) },
      incidentType: "Impacto / caída",
      locationLabel: "Av. Insurgentes Sur, Ciudad de México",
      coordinates: { latitude: 19.4326, longitude: -99.1332 },
      estimatedDistanceKm: 2.4,
      elapsedMinutes: 7,
      locationSharingAllowed: true,
      monitorCanClose: true,
    }),
    createFixtureIncident(1, { folio: "INC-000124", status: "active", severity: "critical", origin: "manual_sos", incidentType: "Botón SOS", elapsedMinutes: 14, locationLabel: "Calz. de Tlalpan, Ciudad de México" }),
    createFixtureIncident(2, { folio: "INC-000125", status: "acknowledged", severity: "medium", origin: "automatic_detection", acknowledgedAt: iso(18), elapsedMinutes: 22, timeline: [timeline("tl-125-created", "created", "Alerta generada", "El sistema detectó desaceleración brusca.", 22), timeline("tl-125-ack", "acknowledged", "Recepción confirmada", "Un operador confirmó la recepción de la alerta.", 18)] }),
    createFixtureIncident(3, { folio: "INC-000126", status: "in_progress", severity: "low", origin: "automatic_detection", acknowledgedAt: iso(105), elapsedMinutes: 120, incidentType: "Alerta preventiva" }),
    createFixtureIncident(4, { folio: "INC-000127", status: "in_progress", severity: "medium", origin: "manual_sos", incidentType: "Pérdida de señal", elapsedMinutes: 34 }),
    createFixtureIncident(5, { folio: "INC-000128", status: "resolved", severity: "high", origin: "automatic_detection", closedAt: iso(60), closure: { resolution: "assistance_provided", notes: "Ayuda proporcionada y conductor estable.", closedAt: iso(60), closedBy: "Operador Central", closedByRole: "monitor" }, elapsedMinutes: 240 }),
    createFixtureIncident(6, { folio: "INC-000129", status: "resolved", severity: "low", origin: "automatic_detection", closedAt: iso(80), closure: { resolution: "false_positive", notes: "Falso positivo confirmado por el conductor.", closedAt: iso(80), closedBy: "Sistema simulado", closedByRole: "conductor" }, elapsedMinutes: 180 }),
    createFixtureIncident(7, { folio: "INC-000130", status: "cancelled", severity: "medium", origin: "manual_sos", closedAt: iso(70), closure: { resolution: "other", notes: "Caso cancelado durante validación operativa.", closedAt: iso(70), closedBy: "Administrador", closedByRole: "administrador" }, elapsedMinutes: 150 }),
    createFixtureIncident(8, { folio: "INC-000131", status: "active", severity: "low", origin: "automatic_detection", incidentType: "Movimiento irregular", elapsedMinutes: 11 }),
    createFixtureIncident(9, { folio: "INC-000132", status: "acknowledged", severity: "critical", origin: "manual_sos", incidentType: "SOS manual crítico", elapsedMinutes: 45, acknowledgedAt: iso(40) }),
  ];

  return incidents.map((incident) => incident.closure ? { ...incident, timeline: [...incident.timeline, timeline(`${incident.id}-closed`, "closed", "Caso cerrado", "El incidente fue cerrado en la bitácora simulada.", 60)] } : incident);
}

function isIncidentArray(value: unknown): value is IncidentRecord[] {
  return Array.isArray(value) && value.every((item) => item && typeof item === "object" && typeof (item as Partial<IncidentRecord>).folio === "string");
}

export function getStoredIncidents(): IncidentRecord[] {
  const stored = window.sessionStorage.getItem(INCIDENTS_STORAGE_KEY);

  if (!stored) {
    const initial = getInitialIncidents();
    saveStoredIncidents(initial);
    return initial;
  }

  try {
    const parsed = JSON.parse(stored) as unknown;
    if (isIncidentArray(parsed)) {
      return parsed;
    }
  } catch {
    window.sessionStorage.removeItem(INCIDENTS_STORAGE_KEY);
  }

  const initial = getInitialIncidents();
  saveStoredIncidents(initial);
  return initial;
}

export function saveStoredIncidents(incidents: IncidentRecord[]): void {
  window.sessionStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(incidents));
}

export function getIncidentByFolio(folio: string): IncidentRecord | null {
  return getStoredIncidents().find((incident) => incident.folio === folio) ?? null;
}

export function updateStoredIncident(nextIncident: IncidentRecord): IncidentRecord {
  const incidents = getStoredIncidents().map((incident) => incident.folio === nextIncident.folio ? nextIncident : incident);
  saveStoredIncidents(incidents);
  return nextIncident;
}

export function addIncidentTimelineEntry(folio: string, entry: Omit<IncidentTimelineEntry, "id" | "occurredAt">): IncidentRecord | null {
  const incident = getIncidentByFolio(folio);
  if (!incident) {
    return null;
  }

  const exists = incident.timeline.some((item) => item.actionType === entry.actionType && item.title === entry.title && item.performedBy === entry.performedBy);
  const nextIncident: IncidentRecord = {
    ...incident,
    timeline: exists ? incident.timeline : [...incident.timeline, { ...entry, id: `${incident.id}-${entry.actionType}-${incident.timeline.length + 1}`, occurredAt: new Date().toISOString() }],
  };

  return updateStoredIncident(nextIncident);
}

export function saveIncidentClosure(folio: string, closure: IncidentClosure): IncidentRecord | null {
  const incident = getIncidentByFolio(folio);
  if (!incident) {
    return null;
  }

  return updateStoredIncident({ ...incident, status: "resolved", closedAt: closure.closedAt, closure });
}
