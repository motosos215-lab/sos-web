import { useNavigate } from "react-router-dom";
import type { DashboardIncident } from "../../../types/dashboard";
import { formatReadableDate } from "../../../utils/dateFormat";
import { IncidentSeverityBadge } from "./IncidentSeverityBadge";
import { IncidentStatusBadge } from "./IncidentStatusBadge";

interface RecentIncidentsListProps {
  canOpenDetails?: boolean;
  incidents: DashboardIncident[];
  isMonitor?: boolean;
}

export function RecentIncidentsList({ canOpenDetails = true, incidents, isMonitor = false }: RecentIncidentsListProps) {
  const navigate = useNavigate();
  const visibleIncidents = incidents.slice(0, 5);

  return (
    <section className="recent-incidents" aria-labelledby="recent-incidents-title">
      <h2 id="recent-incidents-title">{isMonitor ? "Alertas recientes" : "Incidentes recientes"}</h2>
      {visibleIncidents.length === 0 ? (
        <p>{isMonitor ? "No hay alertas para el filtro seleccionado" : "No hay incidentes para el filtro seleccionado"}</p>
      ) : (
        <div className="recent-incidents__table" role="table" aria-label={isMonitor ? "Alertas recientes" : "Incidentes recientes"}>
          <div className="recent-incidents__row recent-incidents__row--head" role="row">
            <span role="columnheader">Folio</span>
            <span role="columnheader">Conductor</span>
            <span role="columnheader">Tipo</span>
            <span role="columnheader">Severidad</span>
            <span role="columnheader">Estado</span>
            <span role="columnheader">Hora</span>
            <span role="columnheader">Ubicación</span>
            <span role="columnheader">Acción</span>
          </div>
          {visibleIncidents.map((incident) => (
            <div className="recent-incidents__row" key={incident.id} role="row">
              <span role="cell" data-label="Folio">
                {incident.folio}
              </span>
              <span role="cell" data-label="Conductor">
                {incident.driverName}
              </span>
              <span role="cell" data-label="Tipo">
                {incident.incidentType}
              </span>
              <span role="cell" data-label="Severidad">
                <IncidentSeverityBadge severity={incident.severity} />
              </span>
              <span role="cell" data-label="Estado">
                <IncidentStatusBadge status={incident.status} />
              </span>
              <span role="cell" data-label="Hora">
                {formatReadableDate(incident.occurredAt)}
              </span>
              <span role="cell" data-label="Ubicación">
                {incident.locationLabel}
              </span>
              <span role="cell" data-label="Acción">
                {isMonitor && incident.notificationDeliveryAttemptId ? (
                  <button
                    onClick={() => navigate(`/dashboard/alertas/${encodeURIComponent(incident.notificationDeliveryAttemptId ?? "")}`)}
                    type="button"
                  >
                    Ver alerta
                  </button>
                ) : isMonitor ? (
                  <span>Sin detalle</span>
                ) : canOpenDetails ? (
                  <button onClick={() => navigate(`/dashboard/incidentes/${encodeURIComponent(incident.folio)}`)} type="button">
                    Ver detalle
                  </button>
                ) : (
                  <span>Solo resumen</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
