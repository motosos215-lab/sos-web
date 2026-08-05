import type { DashboardIncidentSeverity } from "../../../types/dashboard";

interface IncidentSeverityBadgeProps {
  severity: DashboardIncidentSeverity;
}

const labels: Record<DashboardIncidentSeverity, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
};

export function IncidentSeverityBadge({ severity }: IncidentSeverityBadgeProps) {
  return <span className={`incident-severity incident-severity--${severity}`}>{labels[severity]}</span>;
}
