import type { PlanStatus } from "../../../types/plan";

interface PlanStatusBadgeProps {
  status: PlanStatus;
}

const statusLabels: Record<PlanStatus, string> = {
  active: "Activo",
  available: "Disponible",
  pending: "Pendiente",
  expired: "Expirado",
  cancelled: "Cancelado",
};

export function PlanStatusBadge({ status }: PlanStatusBadgeProps) {
  return <span className={`plan-status plan-status--${status}`}>{statusLabels[status]}</span>;
}
