import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components/common/Button/Button";
import { BatteryIndicator } from "../../setup/DevicesSetup/BatteryIndicator";
import { ConnectionIndicator } from "../../setup/DevicesSetup/ConnectionIndicator";
import type { DashboardIncident } from "../../../types/dashboard";
import { copyTextToClipboard } from "../../../utils/clipboard";
import { IncidentSeverityBadge } from "./IncidentSeverityBadge";
import { IncidentStatusBadge } from "./IncidentStatusBadge";

interface ActiveIncidentCardProps {
  incident: DashboardIncident | null;
  isMonitor?: boolean;
}

export function ActiveIncidentCard({ incident, isMonitor = false }: ActiveIncidentCardProps) {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");

  if (!incident) {
    return (
      <section className="active-incident-card" aria-live="polite">
        <h2>{isMonitor ? "Sin alertas pendientes" : "Sin incidentes activos"}</h2>
        <p>
          {isMonitor ? "No tienes alertas asignadas que requieran respuesta." : "En este momento no hay alertas que requieran atención."}
        </p>
      </section>
    );
  }

  const handleShare = async () => {
    const copied = await copyTextToClipboard(`Alerta MotoSOS ${incident.folio}. Consulta la información desde el dashboard autorizado.`);
    setMessage(copied ? "Información de la alerta copiada" : "No pudimos copiar la información de la alerta");
  };

  return (
    <section className="active-incident-card" aria-labelledby="active-incident-title">
      <header>
        <p>{isMonitor ? "Alerta asignada" : "Incidente activo"}</p>
        <h2 id="active-incident-title">{incident.folio}</h2>
      </header>
      <div className="active-incident-card__badges">
        <IncidentSeverityBadge severity={incident.severity} />
        <IncidentStatusBadge status={incident.status} />
      </div>
      <dl className="active-incident-card__details">
        <div>
          <dt>Conductor</dt>
          <dd>{incident.driverName}</dd>
        </div>
        <div>
          <dt>Folio</dt>
          <dd>{incident.folio}</dd>
        </div>
        <div>
          <dt>Tipo de evento</dt>
          <dd>{incident.incidentType}</dd>
        </div>
        <div>
          <dt>Última ubicación</dt>
          <dd>{incident.locationLabel}</dd>
        </div>
        <div>
          <dt>Tiempo transcurrido</dt>
          <dd>{incident.elapsedMinutes} minutos</dd>
        </div>
        <div>
          <dt>Señal</dt>
          <dd>
            <ConnectionIndicator quality={incident.signalStatus} />
          </dd>
        </div>
        <div>
          <dt>Batería</dt>
          <dd>
            <BatteryIndicator level={incident.batteryLevel} />
          </dd>
        </div>
        <div>
          <dt>Vehículo</dt>
          <dd>
            {incident.vehicleAlias} · {incident.vehicleDescription} · {incident.licensePlateMasked}
          </dd>
        </div>
      </dl>
      {message ? (
        <p className="active-incident-card__message" aria-live="polite">
          {message}
        </p>
      ) : null}
      <div className="active-incident-card__actions">
        {!isMonitor ? (
          <Button onClick={() => navigate(`/dashboard/incidentes/${encodeURIComponent(incident.folio)}`)} type="button">
            Ver detalles
          </Button>
        ) : null}
        <Button
          onClick={() =>
            setMessage(
              isMonitor
                ? "Abre la alerta desde la app MotoSOS para ver acciones de respuesta disponibles"
                : "La función de llamada se habilitará cuando el backend proporcione los datos y permisos correspondientes",
            )
          }
          type="button"
          variant="secondary"
        >
          Llamar
        </Button>
        <Button onClick={handleShare} type="button" variant="secondary">
          Compartir
        </Button>
      </div>
    </section>
  );
}
