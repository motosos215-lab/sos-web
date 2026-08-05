import { type LucideIcon, AlertTriangle, CheckCircle2, CircleAlert, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import type { SetupSummaryDetail, SetupSummaryStatus } from "../../../types/setupConfirmation";

interface SetupSummaryCardProps {
  title: string;
  status: SetupSummaryStatus;
  details: SetupSummaryDetail[];
  warning?: string;
  blockingMessage?: string;
  editPath: string;
  icon: LucideIcon;
}

const STATUS_CONFIG: Record<
  SetupSummaryStatus,
  { label: string; Icon: LucideIcon }
> = {
  complete: { label: "Completado", Icon: CheckCircle2 },
  warning: { label: "Recomendación", Icon: AlertTriangle },
  incomplete: { label: "Pendiente", Icon: CircleAlert },
};

export function SetupSummaryCard({
  title,
  status,
  details,
  warning,
  blockingMessage,
  editPath,
  icon: Icon,
}: SetupSummaryCardProps) {
  const { label, Icon: StatusIcon } = STATUS_CONFIG[status];

  return (
    <article className={`setup-summary-card setup-summary-card--${status}`} aria-label={title}>
      <header className="setup-summary-card__header">
        <div className="setup-summary-card__title">
          <Icon className="setup-summary-card__module-icon" aria-hidden="true" size={20} />
          <h3>{title}</h3>
        </div>
        <span className={`setup-summary-card__status setup-summary-card__status--${status}`}>
          <StatusIcon aria-hidden="true" size={14} />
          {label}
        </span>
      </header>

      <dl className="setup-summary-card__details">
        {details.map((detail) => (
          <div className="setup-summary-card__row" key={detail.label}>
            <dt>{detail.label}</dt>
            <dd>{detail.value}</dd>
          </div>
        ))}
      </dl>

      {warning ? (
        <p className="setup-summary-card__warning">
          <AlertTriangle aria-hidden="true" size={14} />
          {warning}
        </p>
      ) : null}

      {blockingMessage ? (
        <p className="setup-summary-card__blocking">
          <CircleAlert aria-hidden="true" size={14} />
          {blockingMessage}
        </p>
      ) : null}

      {editPath ? (
        <Link className="setup-summary-card__edit" to={editPath}>
          <Pencil aria-hidden="true" size={14} />
          {status === "incomplete" ? "Corregir" : "Editar"}
        </Link>
      ) : status !== "incomplete" ? (
        <span className="setup-summary-card__edit setup-summary-card__edit--verified">
          <CheckCircle2 aria-hidden="true" size={14} />
          Cuenta verificada
        </span>
      ) : null}
    </article>
  );
}