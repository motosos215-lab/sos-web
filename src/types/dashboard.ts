export type DashboardIncidentStatus = "active" | "acknowledged" | "in_progress" | "resolved" | "cancelled";

export type DashboardIncidentSeverity = "low" | "medium" | "high" | "critical";

export type DashboardSignalStatus = "strong" | "medium" | "weak" | "offline";

export type DashboardMetricTrend = "up" | "down" | "neutral";

export type DashboardStatusFilter = "all" | "active" | "in_progress" | "resolved" | "critical";

export interface DashboardMetric {
  id: DashboardStatusFilter;
  label: string;
  value: number;
  comparisonText: string;
  trend: DashboardMetricTrend;
}

export interface DashboardCoordinates {
  latitude: number;
  longitude: number;
}

export interface DashboardIncident {
  id: string;
  folio: string;
  tripId: string | null;
  alertDispatchId: string | null;
  notificationDeliveryAttemptId: string | null;
  driverName: string;
  vehicleAlias: string;
  vehicleDescription: string;
  licensePlateMasked: string;
  incidentType: string;
  status: DashboardIncidentStatus;
  severity: DashboardIncidentSeverity;
  occurredAt: string;
  locationLabel: string;
  coordinates: DashboardCoordinates;
  elapsedMinutes: number;
  batteryLevel: number | null;
  signalStatus: DashboardSignalStatus;
}

export interface DashboardSummary {
  metrics: DashboardMetric[];
  incidents: DashboardIncident[];
  lastUpdatedAt: string;
}

export interface DashboardServiceResponse<Data> {
  success: boolean;
  message: string;
  data: Data | null;
}
