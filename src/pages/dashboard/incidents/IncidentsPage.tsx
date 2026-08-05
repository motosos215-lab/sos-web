import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Download, RefreshCw, RotateCcw } from "lucide-react";
import { AlertMessage } from "../../../components/common/AlertMessage/AlertMessage";
import { Button } from "../../../components/common/Button/Button";
import { getIncidents } from "../../../services/incidentService";
import { getSession } from "../../../services/sessionService";
import type { IncidentFilters, IncidentRecord, PaginatedIncidentResult } from "../../../types/incident";
import { formatReadableDate } from "../../../utils/dateFormat";
import { IncidentSeverityBadge } from "../components/IncidentSeverityBadge";
import { IncidentStatusBadge } from "../components/IncidentStatusBadge";
import "./IncidentsPage.css";

const initialFilters: IncidentFilters = { search: "", status: "all", severity: "all", origin: "all", dateFrom: "", dateTo: "", sortBy: "newest" };
const pageSize = 5;

function getOriginLabel(origin: IncidentRecord["origin"]): string {
  return origin === "automatic_detection" ? "Detección automática" : "SOS manual";
}

function isDateRangeInvalid(filters: IncidentFilters): boolean {
  return Boolean(filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo);
}

function getListMetrics(incidents: IncidentRecord[]) {
  return [
    { id: "total", label: "Total de incidentes", value: incidents.length },
    { id: "active", label: "Activos", value: incidents.filter((incident) => incident.status === "active").length },
    { id: "in_progress", label: "En seguimiento", value: incidents.filter((incident) => incident.status === "in_progress").length },
    { id: "critical", label: "Críticos", value: incidents.filter((incident) => incident.severity === "critical").length },
  ];
}

export function IncidentsPage() {
  const session = getSession();
  const [filters, setFilters] = useState<IncidentFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PaginatedIncidentResult | null>(null);
  const [allVisibleIncidents, setAllVisibleIncidents] = useState<IncidentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const rangeInvalid = isDateRangeInvalid(filters);

  const metrics = useMemo(() => getListMetrics(allVisibleIncidents), [allVisibleIncidents]);

  const loadIncidents = async (nextPage = page, refreshing = false) => {
    if (rangeInvalid) {
      return;
    }
    setErrorMessage("");
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    const response = await getIncidents(filters, { page: nextPage, pageSize }, session);
    const allResponse = await getIncidents(initialFilters, { page: 1, pageSize: 100 }, session);
    if (response.success && response.data) {
      setResult(response.data);
      setPage(response.data.currentPage);
    } else {
      setErrorMessage("No pudimos cargar los incidentes");
    }
    if (allResponse.success && allResponse.data) {
      setAllVisibleIncidents(allResponse.data.items);
    }
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void loadIncidents(1);
  }, [filters]);

  const updateFilters = (updates: Partial<IncidentFilters>) => {
    setPage(1);
    setMessage("");
    setFilters((current) => ({ ...current, ...updates }));
  };

  const handleMetricFilter = (metricId: string) => {
    if (metricId === "total") {
      updateFilters({ status: "all", severity: "all" });
    } else if (metricId === "critical") {
      updateFilters({ severity: "critical", status: "all" });
    } else if (metricId === "active" || metricId === "in_progress") {
      updateFilters({ status: metricId, severity: "all" });
    }
  };

  const handleSubmitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadIncidents(1);
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setPage(1);
    setMessage("");
  };

  const showingStart = result && result.totalItems > 0 ? (result.currentPage - 1) * result.pageSize + 1 : 0;
  const showingEnd = result ? Math.min(result.currentPage * result.pageSize, result.totalItems) : 0;
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(initialFilters);

  return (
    <div className="incidents-page">
      <header className="incidents-page__header">
        <div>
          <p>Centro operativo</p>
          <h1>Incidentes</h1>
          <span>Consulta, filtra y da seguimiento a las alertas registradas en MotoSOS.</span>
        </div>
        <div className="incidents-page__header-actions">
          <Button isLoading={isRefreshing} loadingText="Actualizando..." onClick={() => void loadIncidents(page, true)} type="button" variant="secondary"><RefreshCw aria-hidden="true" size={16} /> Actualizar</Button>
          <Button onClick={() => setMessage("La exportación estará disponible en Reportes e historial")} type="button" variant="secondary"><Download aria-hidden="true" size={16} /> Exportar vista</Button>
          <Button onClick={clearFilters} type="button" variant="secondary"><RotateCcw aria-hidden="true" size={16} /> Limpiar filtros</Button>
        </div>
      </header>

      <div className="incidents-page__messages">
        {message ? <AlertMessage variant="info">{message}</AlertMessage> : null}
        {errorMessage ? <AlertMessage variant="error">{errorMessage}</AlertMessage> : null}
      </div>

      <section className="incidents-metrics" aria-label="Métricas de incidentes">
        {metrics.map((metric) => (
          <button className="incidents-metric" key={metric.id} onClick={() => handleMetricFilter(metric.id)} type="button">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </button>
        ))}
      </section>

      <form className="incidents-filters" noValidate onSubmit={handleSubmitFilters}>
        <label><span>Buscar</span><input onChange={(event) => updateFilters({ search: event.target.value })} placeholder="Buscar por folio, conductor o vehículo..." type="search" value={filters.search} /></label>
        <label><span>Estado</span><select onChange={(event) => updateFilters({ status: event.target.value as IncidentFilters["status"] })} value={filters.status}><option value="all">Todos</option><option value="active">Activos</option><option value="acknowledged">Confirmados</option><option value="in_progress">En seguimiento</option><option value="resolved">Resueltos</option><option value="cancelled">Cancelados</option></select></label>
        <label><span>Severidad</span><select onChange={(event) => updateFilters({ severity: event.target.value as IncidentFilters["severity"] })} value={filters.severity}><option value="all">Todas</option><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option><option value="critical">Crítica</option></select></label>
        <label><span>Origen</span><select onChange={(event) => updateFilters({ origin: event.target.value as IncidentFilters["origin"] })} value={filters.origin}><option value="all">Todos</option><option value="automatic_detection">Detección automática</option><option value="manual_sos">SOS manual</option></select></label>
        <label><span>Fecha desde</span><input aria-describedby={rangeInvalid ? "incident-date-error" : undefined} onChange={(event) => updateFilters({ dateFrom: event.target.value })} type="date" value={filters.dateFrom} /></label>
        <label><span>Fecha hasta</span><input aria-describedby={rangeInvalid ? "incident-date-error" : undefined} onChange={(event) => updateFilters({ dateTo: event.target.value })} type="date" value={filters.dateTo} /></label>
        <label><span>Ordenar</span><select onChange={(event) => updateFilters({ sortBy: event.target.value as IncidentFilters["sortBy"] })} value={filters.sortBy}><option value="newest">Más recientes</option><option value="oldest">Más antiguos</option><option value="severity">Mayor severidad</option></select></label>
        {rangeInvalid ? <p className="incidents-filters__error" id="incident-date-error" role="alert">La fecha desde no puede ser posterior a la fecha hasta.</p> : null}
      </form>

      {isLoading ? <section className="incidents-state" aria-busy="true">Cargando incidentes...</section> : null}
      {!isLoading && !result ? <section className="incidents-state"><p>No pudimos cargar los incidentes</p><Button onClick={() => void loadIncidents(1)} type="button">Reintentar</Button></section> : null}
      {!isLoading && result && result.totalItems === 0 ? <section className="incidents-state"><h2>{hasFilters ? "No encontramos incidentes con los filtros seleccionados" : "No hay incidentes registrados"}</h2>{hasFilters ? <Button onClick={clearFilters} type="button">Limpiar filtros</Button> : null}</section> : null}

      {!isLoading && result && result.items.length > 0 ? (
        <>
          <div className="incidents-table-wrap">
            <table className="incidents-table">
              <caption>Listado de incidentes MotoSOS</caption>
              <thead><tr><th>Folio</th><th>Fecha y hora</th><th>Conductor</th><th>Vehículo</th><th>Tipo</th><th>Origen</th><th>Severidad</th><th>Estado</th><th>Tiempo</th><th>Ubicación</th><th>Acción</th></tr></thead>
              <tbody>
                {result.items.map((incident) => (
                  <tr key={incident.folio}>
                    <td>{incident.folio}</td><td>{formatReadableDate(incident.occurredAt)}</td><td>{incident.driver.fullName}</td><td>{incident.vehicle.alias} · {incident.vehicle.brand} {incident.vehicle.model}</td><td>{incident.incidentType}</td><td>{getOriginLabel(incident.origin)}</td><td><IncidentSeverityBadge severity={incident.severity} /></td><td><IncidentStatusBadge status={incident.status} /></td><td>{incident.elapsedMinutes} min</td><td>{incident.locationLabel}</td><td><Link to={`/dashboard/incidentes/${encodeURIComponent(incident.folio)}`}>Ver detalle</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="incidents-mobile-list">
            {result.items.map((incident) => (
              <article className="incident-mobile-card" key={incident.folio}>
                <header><strong>{incident.folio}</strong><IncidentSeverityBadge severity={incident.severity} /></header>
                <IncidentStatusBadge status={incident.status} />
                <p>{incident.driver.fullName}</p><p>{incident.vehicle.alias} · {incident.vehicle.brand} {incident.vehicle.model}</p><p>{incident.incidentType} · {getOriginLabel(incident.origin)}</p><p>{formatReadableDate(incident.occurredAt)} · {incident.elapsedMinutes} min</p><p>{incident.locationLabel}</p>
                <Link to={`/dashboard/incidentes/${encodeURIComponent(incident.folio)}`}>Ver detalle</Link>
              </article>
            ))}
          </div>
          <nav className="incidents-pagination" aria-label="Paginación de incidentes">
            <span>Mostrando {showingStart} a {showingEnd} de {result.totalItems} incidentes</span>
            <Button disabled={result.currentPage === 1} onClick={() => void loadIncidents(result.currentPage - 1)} type="button" variant="secondary">Anterior</Button>
            {Array.from({ length: result.totalPages }, (_, index) => index + 1).map((pageNumber) => <button aria-current={pageNumber === result.currentPage ? "page" : undefined} key={pageNumber} onClick={() => void loadIncidents(pageNumber)} type="button">{pageNumber}</button>)}
            <Button disabled={result.currentPage === result.totalPages} onClick={() => void loadIncidents(result.currentPage + 1)} type="button" variant="secondary">Siguiente</Button>
          </nav>
        </>
      ) : null}
    </div>
  );
}
