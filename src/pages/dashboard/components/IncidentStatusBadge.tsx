import type { DashboardIncidentStatus } from "../../../types/dashboard";

interface IncidentStatusBadgeProps {
  status: DashboardIncidentStatus;
}

const labels: Record<DashboardIncidentStatus, string> = {
  active: "Activo",
  acknowledged: "Confirmado",
  in_progress: "En seguimiento",
  resolved: "Resuelto",
  cancelled: "Cancelado",
};

export function IncidentStatusBadge({ status }: IncidentStatusBadgeProps) {
  return <span className={`incident-status incident-status--${status}`}>{labels[status]}</span>;
}
