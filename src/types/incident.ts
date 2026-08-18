export type IncidentStatus = "active" | "acknowledged" | "in_progress" | "resolved" | "cancelled";
export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentOrigin = "automatic_detection" | "manual_sos";
export type IncidentResolution = "driver_safe" | "false_positive" | "assistance_provided" | "external_contact_assisted" | "other";
export type IncidentActionType =
  | "created"
  | "notification_sent"
  | "acknowledged"
  | "call_registered"
  | "message_registered"
  | "location_shared"
  | "contacts_notified"
  | "follow_up_started"
  | "driver_marked_safe"
  | "closed"
  | "cancelled";
export type IncidentSignalStatus = "strong" | "medium" | "weak" | "offline";

export interface IncidentCoordinates {
  latitude: number;
  longitude: number;
}

export interface IncidentDriverSummary {
  id: string;
  fullName: string;
  phoneMasked: string;
  emailMasked: string;
  bloodType: string | null;
  city: string;
}

export interface IncidentVehicleSummary {
  id: string;
  alias: string;
  type: "motocicleta" | "motoneta";
  brand: string;
  model: string;
  year: number;
  licensePlateMasked: string;
}

export interface IncidentDeviceSummary {
  mobileBatteryLevel: number | null;
  smartwatchBatteryLevel: number | null;
  signalStatus: IncidentSignalStatus;
  gpsAccuracyMeters: number | null;
  lastSynchronization: string | null;
}

export interface IncidentContactSummary {
  id: string;
  fullName: string;
  relationship: string;
  phoneMasked: string;
  invitationStatus: "linked" | "invited" | "pending" | "expired" | "revoked";
  canReceiveLocation: boolean;
  canReceiveCriticalAlerts: boolean;
}

export interface IncidentTimelineEntry {
  id: string;
  actionType: IncidentActionType;
  title: string;
  description: string;
  occurredAt: string;
  performedBy: string | null;
  performedRole: string | null;
}

export interface IncidentClosure {
  resolution: IncidentResolution;
  notes: string;
  closedAt: string;
  closedBy: string;
  closedByRole: string;
}

export interface IncidentRecord {
  id: string;
  folio: string;
  tripId: string | null;
  ownerUserId: string;
  driver: IncidentDriverSummary;
  vehicle: IncidentVehicleSummary;
  device: IncidentDeviceSummary;
  contacts: IncidentContactSummary[];
  status: IncidentStatus;
  severity: IncidentSeverity;
  origin: IncidentOrigin;
  incidentType: string;
  occurredAt: string;
  acknowledgedAt: string | null;
  closedAt: string | null;
  locationLabel: string;
  coordinates: IncidentCoordinates;
  estimatedDistanceKm: number | null;
  elapsedMinutes: number;
  description: string;
  assignedMonitorName: string | null;
  locationSharingAllowed: boolean;
  monitorCanClose: boolean;
  timeline: IncidentTimelineEntry[];
  closure: IncidentClosure | null;
}

export interface IncidentFilters {
  search: string;
  status: IncidentStatus | "all";
  severity: IncidentSeverity | "all";
  origin: IncidentOrigin | "all";
  dateFrom: string;
  dateTo: string;
  sortBy: "newest" | "oldest" | "severity";
}

export interface IncidentPagination {
  page: number;
  pageSize: number;
}

export interface PaginatedIncidentResult {
  items: IncidentRecord[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface ServiceResult<T> {
  success: boolean;
  message: string;
  data: T | null;
}

export interface IncidentActor {
  userId: string;
  name: string;
  role: string;
}

export interface IncidentCallData {
  result: "no_answer" | "successful" | "unavailable";
  note: string;
}

export interface IncidentMessageData {
  message: string;
}

export interface IncidentNotifyData {
  contactIds: string[];
  channel: "push" | "sms" | "email";
}

export interface IncidentCloseData {
  resolution: IncidentResolution;
  notes: string;
}
