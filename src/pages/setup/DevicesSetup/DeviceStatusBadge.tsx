import type { DeviceStatus } from "../../../types/device";

interface DeviceStatusBadgeProps {
  status: DeviceStatus;
}

const statusLabels: Record<DeviceStatus, string> = {
  not_linked: "No vinculada",
  pending: "Pendiente",
  linked: "Vinculada",
  offline: "Sin conexión",
  revoked: "Revocada",
};

export function DeviceStatusBadge({ status }: DeviceStatusBadgeProps) {
  return (
    <span className={`device-status device-status--${status}`}>
      <span aria-hidden="true" />
      {statusLabels[status]}
    </span>
  );
}
