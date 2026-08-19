import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { AlertMessage } from "../../components/common/AlertMessage/AlertMessage";
import { Button } from "../../components/common/Button/Button";
import { getIncidents } from "../../services/incidentService";
import { getSession } from "../../services/sessionService";
import type { IncidentRecord } from "../../types/incident";
import { getApiErrorMessage } from "../../utils/apiErrors";
import "./DashboardUtilityPages.css";

const filters = { search: "", status: "all", severity: "all", origin: "all", dateFrom: "", dateTo: "", sortBy: "newest" } as const;

function markerPosition(incident: IncidentRecord) {
  const lat = Math.max(Math.min(incident.coordinates.latitude, 90), -90);
  const lng = Math.max(Math.min(incident.coordinates.longitude, 180), -180);
  return {
    left: `${((lng + 180) / 360) * 100}%`,
    top: `${((90 - lat) / 180) * 100}%`,
  };
}

export function DashboardMapPage() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const load = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await getIncidents(filters, { page: 1, pageSize: 100 }, getSession());
      if (response.success && response.data) {
        setIncidents(response.data.items);
      } else {
        setErrorMessage(response.message);
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="dashboard-utility">
      <header className="dashboard-utility__header">
        <div>
          <p>Ubicación operativa</p>
          <h1>Mapa</h1>
          <span>Vista de incidentes reales con la última coordenada disponible. El backend actual no expone live tracking.</span>
        </div>
        <Button isLoading={isLoading} loadingText="Actualizando..." onClick={() => void load()} type="button" variant="secondary">
          <RefreshCw aria-hidden="true" size={16} /> Actualizar
        </Button>
      </header>

      {errorMessage ? <AlertMessage variant="error">{errorMessage}</AlertMessage> : null}

      <section className="dashboard-utility__grid">
        <div className="dashboard-utility__map" aria-label="Mapa aproximado de incidentes">
          {incidents.map((incident) => (
            <Link
              aria-label={`Ver incidente ${incident.folio}`}
              className="dashboard-utility__marker"
              key={incident.id}
              style={markerPosition(incident)}
              to={`/dashboard/incidentes/${encodeURIComponent(incident.folio)}`}
            />
          ))}
        </div>
        <article className="dashboard-utility__panel">
          <h2>Incidentes ubicados</h2>
          {isLoading ? <p>Cargando ubicaciones...</p> : null}
          {!isLoading && incidents.length === 0 ? <p>No hay incidentes con ubicación disponible.</p> : null}
          {incidents.length > 0 ? (
            <ul className="dashboard-utility__list">
              {incidents.slice(0, 8).map((incident) => (
                <li key={incident.id}>
                  <strong>{incident.folio}</strong>
                  <p>{incident.locationLabel}</p>
                  <Link to={`/dashboard/incidentes/${encodeURIComponent(incident.folio)}`}>Ver detalle</Link>
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      </section>
    </div>
  );
}
