import type { ConnectionQuality } from "../../../types/device";

interface ConnectionIndicatorProps {
  quality: ConnectionQuality;
}

const qualityLabels: Record<ConnectionQuality, string> = {
  strong: "Fuerte",
  medium: "Media",
  weak: "Débil",
  offline: "Sin conexión",
};

export function ConnectionIndicator({ quality }: ConnectionIndicatorProps) {
  return (
    <span className={`device-connection device-connection--${quality}`} aria-label={`Calidad de conexión: ${qualityLabels[quality]}`}>
      <span aria-hidden="true" />
      Conexión: {qualityLabels[quality]}
    </span>
  );
}
