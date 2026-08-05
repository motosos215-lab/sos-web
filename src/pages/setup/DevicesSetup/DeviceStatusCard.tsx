import { Button } from "../../../components/common/Button/Button";
import type { LinkedDevice } from "../../../types/device";
import { formatReadableDate, formatRelativeDate } from "../../../utils/dateFormat";
import { BatteryIndicator } from "./BatteryIndicator";
import { ConnectionIndicator } from "./ConnectionIndicator";
import { DeviceStatusBadge } from "./DeviceStatusBadge";

interface DeviceStatusCardProps {
  device: LinkedDevice;
  isRefreshing: boolean;
  onRefresh: (deviceId: string) => void;
  onRevoke: (device: LinkedDevice) => void;
  reportedByMobileApp?: boolean;
  title: string;
}

export function DeviceStatusCard({
  device,
  isRefreshing,
  onRefresh,
  onRevoke,
  reportedByMobileApp = false,
  title,
}: DeviceStatusCardProps) {
  const isRevoked = device.status === "revoked";

  return (
    <article className="device-card" aria-labelledby={`${device.id}-title`}>
      <header className="device-card__header">
        <div>
          <p>Estado de dispositivo</p>
          <h2 id={`${device.id}-title`}>{title}</h2>
        </div>
        <DeviceStatusBadge status={device.status} />
      </header>

      {reportedByMobileApp ? <p className="device-card__note">Este estado fue reportado por la aplicación móvil.</p> : null}

      <dl className="device-details">
        <div>
          <dt>Nombre</dt>
          <dd>{device.name}</dd>
        </div>
        {device.type === "smartwatch" ? (
          <div>
            <dt>Modelo</dt>
            <dd>{device.model}</dd>
          </div>
        ) : null}
        <div>
          <dt>Sistema operativo</dt>
          <dd>{device.operatingSystem}</dd>
        </div>
        <div>
          <dt>Batería</dt>
          <dd><BatteryIndicator level={device.batteryLevel} /></dd>
        </div>
        <div>
          <dt>Conexión</dt>
          <dd><ConnectionIndicator quality={device.connectionQuality} /></dd>
        </div>
        <div>
          <dt>Última sincronización</dt>
          <dd>{formatRelativeDate(device.lastSynchronization)}</dd>
        </div>
        <div>
          <dt>Fecha de vinculación</dt>
          <dd>{formatReadableDate(device.linkedAt)}</dd>
        </div>
      </dl>

      <div className="device-card__actions">
        <Button
          disabled={isRevoked || isRefreshing}
          isLoading={isRefreshing}
          loadingText="Actualizando..."
          onClick={() => onRefresh(device.id)}
          type="button"
          variant="secondary"
        >
          Actualizar estado
        </Button>
        <Button disabled={isRevoked} onClick={() => onRevoke(device)} type="button" variant="secondary">
          Revocar dispositivo
        </Button>
      </div>
    </article>
  );
}
