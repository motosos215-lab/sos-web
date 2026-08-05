import type { LucideIcon } from "lucide-react";
import type { DashboardMetric, DashboardStatusFilter } from "../../../types/dashboard";

interface MetricCardProps {
  icon: LucideIcon;
  isActive: boolean;
  metric: DashboardMetric;
  onFilter: (filter: DashboardStatusFilter) => void;
}

export function MetricCard({ icon: Icon, isActive, metric, onFilter }: MetricCardProps) {
  return (
    <article className={`metric-card ${isActive ? "metric-card--active" : ""}`.trim()} aria-labelledby={`metric-${metric.id}`}>
      <div className="metric-card__icon" aria-hidden="true">
        <Icon size={22} />
      </div>
      <div className="metric-card__body">
        <h2 id={`metric-${metric.id}`}>{metric.label}</h2>
        <strong>{metric.value}</strong>
        <p className={`metric-card__trend metric-card__trend--${metric.trend}`}>{metric.comparisonText}</p>
      </div>
      <button aria-pressed={isActive} onClick={() => onFilter(metric.id)} type="button">
        Filtrar por {metric.label.toLowerCase()}
      </button>
    </article>
  );
}
