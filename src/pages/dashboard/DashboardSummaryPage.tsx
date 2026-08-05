import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, RefreshCw, ShieldAlert, Siren } from "lucide-react";
import { AlertMessage } from "../../components/common/AlertMessage/AlertMessage";
import { Button } from "../../components/common/Button/Button";
import { filterDashboardIncidents, getDashboardSummary, refreshDashboardSummary } from "../../services/dashboardService";
import type { DashboardIncident, DashboardStatusFilter, DashboardSummary } from "../../types/dashboard";
import { formatRelativeDate } from "../../utils/dateFormat";
import { ActiveIncidentCard } from "./components/ActiveIncidentCard";
import { DashboardEmptyState } from "./components/DashboardEmptyState";
import { DashboardFilter } from "./components/DashboardFilter";
import { DashboardMapPreview } from "./components/DashboardMapPreview";
import { DashboardSkeleton } from "./components/DashboardSkeleton";
import { MetricCard } from "./components/MetricCard";
import { RecentIncidentsList } from "./components/RecentIncidentsList";
import "./DashboardSummaryPage.css";

export function DashboardSummaryPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<DashboardIncident | null>(null);
  const [filter, setFilter] = useState<DashboardStatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const filteredIncidents = useMemo(
    () => filterDashboardIncidents(filter, summary?.incidents ?? []),
    [filter, summary?.incidents],
  );

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await getDashboardSummary();
        if (!response.success || !response.data) {
          setErrorMessage("No pudimos cargar el dashboard");
          return;
        }

        setSummary(response.data);
        setSelectedIncident(response.data.incidents[0] ?? null);
      } catch {
        setErrorMessage("No pudimos cargar el dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  useEffect(() => {
    if (!selectedIncident || filteredIncidents.some((incident) => incident.id === selectedIncident.id)) {
      return;
    }

    setSelectedIncident(filteredIncidents[0] ?? null);
  }, [filteredIncidents, selectedIncident]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await refreshDashboardSummary();
      if (!response.success || !response.data) {
        setErrorMessage("No pudimos actualizar el dashboard");
        return;
      }

      setSummary(response.data);
      setSuccessMessage(response.message);
    } catch {
      setErrorMessage("No pudimos actualizar el dashboard");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRetry = () => {
    setIsLoading(true);
    setErrorMessage("");
    void getDashboardSummary().then((response) => {
      if (response.success && response.data) {
        setSummary(response.data);
        setSelectedIncident(response.data.incidents[0] ?? null);
      } else {
        setErrorMessage("No pudimos cargar el dashboard");
      }
      setIsLoading(false);
    });
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!summary) {
    return (
      <section className="dashboard-summary dashboard-summary--error">
        <AlertMessage variant="error">{errorMessage || "No pudimos cargar el dashboard"}</AlertMessage>
        <Button onClick={handleRetry} type="button">Reintentar</Button>
      </section>
    );
  }

  return (
    <div className="dashboard-summary">
      <header className="dashboard-summary__header">
        <div>
          <p>Resumen operativo</p>
          <h1>Dashboard general</h1>
          <span>Vista general del sistema y de las alertas registradas.</span>
          <small>Última actualización: {formatRelativeDate(summary.lastUpdatedAt)}</small>
        </div>
        <div className="dashboard-summary__actions">
          <DashboardFilter disabled={isRefreshing} onChange={setFilter} value={filter} />
          <Button isLoading={isRefreshing} loadingText="Actualizando..." onClick={handleRefresh} type="button">
            <RefreshCw aria-hidden="true" className={isRefreshing ? "dashboard-summary__refresh-icon dashboard-summary__refresh-icon--spinning" : "dashboard-summary__refresh-icon"} size={16} />
            Actualizar
          </Button>
        </div>
      </header>

      <div className="dashboard-summary__messages">
        {errorMessage ? <AlertMessage variant="error">{errorMessage}</AlertMessage> : null}
        {successMessage ? <AlertMessage variant="success">{successMessage}</AlertMessage> : null}
      </div>

      <section className="dashboard-summary__metrics" aria-label="Indicadores principales">
        {summary.metrics.map((metric) => {
          const icon = metric.id === "active" ? Siren : metric.id === "in_progress" ? Eye : metric.id === "resolved" ? CheckCircle2 : ShieldAlert;

          return (
            <MetricCard
              icon={icon}
              isActive={filter === metric.id}
              key={metric.id}
              metric={metric}
              onFilter={setFilter}
            />
          );
        })}
      </section>

      {filteredIncidents.length === 0 ? (
        <DashboardEmptyState onShowAll={() => setFilter("all")} title="Sin incidentes activos" message="En este momento no existen alertas que requieran atención" />
      ) : (
        <section className="dashboard-summary__map-grid" aria-label="Mapa e incidente seleccionado">
          <DashboardMapPreview
            incidents={filteredIncidents}
            onSelectIncident={setSelectedIncident}
            selectedIncidentId={selectedIncident?.id ?? null}
          />
          <ActiveIncidentCard incident={selectedIncident ?? filteredIncidents[0] ?? null} />
        </section>
      )}

      <RecentIncidentsList incidents={filteredIncidents} />
    </div>
  );
}
