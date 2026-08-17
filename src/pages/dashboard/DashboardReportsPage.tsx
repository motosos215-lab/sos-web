import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { AlertMessage } from "../../components/common/AlertMessage/AlertMessage";
import { Button } from "../../components/common/Button/Button";
import { getResolutionReports, type ResolutionReportSummary } from "../../services/reportService";
import { getApiErrorMessage } from "../../utils/apiErrors";
import { formatReadableDate } from "../../utils/dateFormat";
import "./DashboardUtilityPages.css";

function formatSeconds(seconds: number | null): string {
  if (seconds === null) {
    return "Sin dato";
  }

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}s`;
}

export function DashboardReportsPage() {
  const [reports, setReports] = useState<ResolutionReportSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const load = async () => {
    setErrorMessage("");
    setIsLoading(true);
    try {
      setReports(await getResolutionReports());
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
          <p>Cierre de emergencias</p>
          <h1>Reportes</h1>
          <span>Reportes formales generados para incidentes cerrados o cancelados.</span>
        </div>
        <Button isLoading={isLoading} loadingText="Actualizando..." onClick={() => void load()} type="button" variant="secondary">
          <RefreshCw aria-hidden="true" size={16} /> Actualizar
        </Button>
      </header>

      {errorMessage ? <AlertMessage variant="error">{errorMessage}</AlertMessage> : null}

      <section className="dashboard-utility__panel">
        {isLoading ? <p>Cargando reportes...</p> : null}
        {!isLoading && reports.length === 0 ? <p>No hay reportes de resolución registrados.</p> : null}
        {reports.length > 0 ? (
          <ul className="dashboard-utility__list">
            {reports.map((report) => (
              <li key={report.id}>
                <strong>{report.outcome}</strong>
                <p>{report.summary}</p>
                <p>
                  Incidente: <Link to={`/dashboard/incidentes/${encodeURIComponent(report.incidentId)}`}>{report.incidentId}</Link>
                </p>
                <p>
                  Cierre: {report.incidentClosedAtUtc ? formatReadableDate(report.incidentClosedAtUtc) : "Sin dato"} · Respuesta:{" "}
                  {formatSeconds(report.responseTimeSeconds)}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
