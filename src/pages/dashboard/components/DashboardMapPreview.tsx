import type { DashboardIncident } from "../../../types/dashboard";

interface DashboardMapPreviewProps {
  incidents: DashboardIncident[];
  onSelectIncident: (incident: DashboardIncident) => void;
  selectedIncidentId: string | null;
}

function getMarkerClass(incident: DashboardIncident, selectedIncidentId: string | null) {
  const markerType = incident.status === "resolved" ? "resolved" : incident.status === "active" ? "active" : "driver";
  return `dashboard-map__marker dashboard-map__marker--${markerType} ${selectedIncidentId === incident.id ? "dashboard-map__marker--selected" : ""}`.trim();
}

function getMarkerPosition(incident: DashboardIncident) {
  const lat = Math.max(Math.min(incident.coordinates.latitude, 90), -90);
  const lng = Math.max(Math.min(incident.coordinates.longitude, 180), -180);

  return {
    left: `${((lng + 180) / 360) * 100}%`,
    top: `${((90 - lat) / 180) * 100}%`,
  };
}

export function DashboardMapPreview({ incidents, onSelectIncident, selectedIncidentId }: DashboardMapPreviewProps) {
  return (
    <section className="dashboard-map-card" aria-labelledby="map-preview-title">
      <header>
        <p>Vista operativa</p>
        <h2 id="map-preview-title">Ubicación operativa</h2>
      </header>
      <div className="dashboard-map" aria-label="Mapa con marcadores de incidentes y conductores">
        <span className="dashboard-map__street dashboard-map__street--one" aria-hidden="true" />
        <span className="dashboard-map__street dashboard-map__street--two" aria-hidden="true" />
        <span className="dashboard-map__street dashboard-map__street--three" aria-hidden="true" />
        <span className="dashboard-map__route" aria-hidden="true" />
        <span className="dashboard-map__block dashboard-map__block--one" aria-hidden="true" />
        <span className="dashboard-map__block dashboard-map__block--two" aria-hidden="true" />
        {incidents.length > 0 ? (
          incidents.map((incident, index) => (
            <button
              aria-label={`Seleccionar incidente ${incident.folio}`}
              className={getMarkerClass(incident, selectedIncidentId)}
              key={incident.id}
              onClick={() => onSelectIncident(incident)}
              style={getMarkerPosition(incident)}
              type="button"
            >
              <span>{index + 1}</span>
            </button>
          ))
        ) : (
          <p className="dashboard-map__empty">No hay ubicaciones activas para mostrar</p>
        )}
      </div>
      <ul className="dashboard-map__legend" aria-label="Leyenda del mapa preliminar">
        <li>
          <span className="dashboard-map__dot dashboard-map__dot--active" /> Incidente activo
        </li>
        <li>
          <span className="dashboard-map__dot dashboard-map__dot--driver" /> En seguimiento
        </li>
        <li>
          <span className="dashboard-map__dot dashboard-map__dot--resolved" /> Resuelto
        </li>
      </ul>
    </section>
  );
}
