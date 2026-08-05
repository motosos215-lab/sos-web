interface BatteryIndicatorProps {
  level: number | null;
}

function getBatteryClass(level: number | null) {
  if (level === null) {
    return "device-battery--unknown";
  }

  if (level <= 20) {
    return "device-battery--low";
  }

  if (level <= 50) {
    return "device-battery--warning";
  }

  return "device-battery--normal";
}

export function BatteryIndicator({ level }: BatteryIndicatorProps) {
  if (level === null) {
    return <span className="device-battery device-battery--unknown">Batería: Sin información</span>;
  }

  return (
    <div className={`device-battery ${getBatteryClass(level)}`} aria-label={`Batería: ${level}%`}>
      <span>Batería: {level}%</span>
      <div className="device-battery__track" aria-hidden="true">
        <span style={{ width: `${level}%` }} />
      </div>
    </div>
  );
}
