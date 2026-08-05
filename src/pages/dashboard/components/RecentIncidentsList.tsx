import { useNavigate } from "react-router-dom";
import type { DashboardIncident } from "../../../types/dashboard";
import { formatReadableDate } from "../../../utils/dateFormat";
import { IncidentSeverityBadge } from "./IncidentSeverityBadge";
import { IncidentStatusBadge } from "./IncidentStatusBadge";

interface RecentIncidentsListProps {
  incidents: DashboardIncident[];
}

export function RecentIncidentsList({ incidents }: RecentIncidentsListProps) {
  const navigate = useNavigate();
  const visibleIncidents = incidents.slice(0, 5);

  return (
    <section className="recent-incidents" aria-labelledby="recent-incidents-title">
      <h2 id="recent-incidents-title">Incidentes recientes</h2>
      {visibleIncidents.length === 0 ? (
        <p>No hay incidentes para el filtro seleccionado</p>
      ) : (
        <div className="recent-incidents__table" role="table" aria-label="Incidentes recientes">
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
              <span role="cell" data-label="Folio">{incident.folio}</span>
              <span role="cell" data-label="Conductor">{incident.driverName}</span>
              <span role="cell" data-label="Tipo">{incident.incidentType}</span>
              <span role="cell" data-label="Severidad"><IncidentSeverityBadge severity={incident.severity} /></span>
              <span role="cell" data-label="Estado"><IncidentStatusBadge status={incident.status} /></span>
              <span role="cell" data-label="Hora">{formatReadableDate(incident.occurredAt)}</span>
              <span role="cell" data-label="Ubicación">{incident.locationLabel}</span>
              <span role="cell" data-label="Acción">
                <button onClick={() => navigate(`/dashboard/incidentes/${encodeURIComponent(incident.folio)}`)} type="button">Ver detalle</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
