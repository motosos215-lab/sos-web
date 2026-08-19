import { Button } from "../../../components/common/Button/Button";
import type { LinkedDevice, MobileDevice, SmartwatchDevice } from "../../../types/device";
import { DeviceInstructions } from "./DeviceInstructions";
import { DeviceStatusBadge } from "./DeviceStatusBadge";
import { DeviceStatusCard } from "./DeviceStatusCard";

interface SmartwatchStatusCardProps {
  isRefreshing: boolean;
  isCheckingStatus: boolean;
  mobileDevice: MobileDevice | null;
  onRefresh: (deviceId: string) => void;
  onRevoke: (device: LinkedDevice) => void;
  onCheckStatus: () => void;
  smartwatchDevice: SmartwatchDevice | null;
}

export function SmartwatchStatusCard({
  isRefreshing,
  isCheckingStatus,
  mobileDevice,
  onRefresh,
  onRevoke,
  onCheckStatus,
  smartwatchDevice,
}: SmartwatchStatusCardProps) {
  if (smartwatchDevice) {
    return (
      <DeviceStatusCard
        device={smartwatchDevice}
        isRefreshing={isRefreshing}
        onRefresh={onRefresh}
        onRevoke={onRevoke}
        reportedByMobileApp
        title="Smartwatch"
      />
    );
  }

  const canCheckStatus = mobileDevice?.status === "linked";

  return (
    <article className="device-card device-card--pending" aria-labelledby="smartwatch-title">
      <header className="device-card__header">
        <div>
          <p>Estado reportado por app móvil</p>
          <h2 id="smartwatch-title">Smartwatch</h2>
        </div>
        <DeviceStatusBadge status="pending" />
      </header>
      <p>El smartwatch se vincula desde la aplicación móvil.</p>
      <DeviceInstructions />
      <p className="device-card__note">La web no busca dispositivos Bluetooth ni se conecta directamente al reloj.</p>
      <Button
        disabled={!canCheckStatus || isCheckingStatus}
        isLoading={isCheckingStatus}
        loadingText="Consultando estado reportado por la app móvil..."
        onClick={onCheckStatus}
        type="button"
        variant="secondary"
      >
        Consultar estado del smartwatch
      </Button>
    </article>
  );
}
