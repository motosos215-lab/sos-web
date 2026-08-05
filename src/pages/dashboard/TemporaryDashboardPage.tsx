import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Construction } from "lucide-react";
import { Button } from "../../components/common/Button/Button";
import "./TemporaryDashboardPage.css";

interface TemporaryDashboardPageProps {
  message: string;
  showIncidentId?: boolean;
  title: string;
}

function sanitizeIncidentId(value: string | undefined) {
  if (!value) {
    return "Sin folio";
  }

  return value.replace(/[^A-Z0-9-]/gi, "").slice(0, 24) || "Folio no válido";
}

export function TemporaryDashboardPage({ message, showIncidentId = false, title }: TemporaryDashboardPageProps) {
  const navigate = useNavigate();
  const { incidentId } = useParams();

  return (
    <section className="temporary-dashboard-page" aria-labelledby="temporary-dashboard-title">
      <Construction aria-hidden="true" size={42} />
      <p>Dashboard MotoSOS</p>
      <h1 id="temporary-dashboard-title">{title}</h1>
      {showIncidentId ? <strong>Folio: {sanitizeIncidentId(incidentId)}</strong> : null}
      <span>{message}</span>
      <Button onClick={() => navigate("/dashboard/resumen")} type="button"><ArrowLeft aria-hidden="true" size={16} /> Volver al resumen</Button>
    </section>
  );
}
