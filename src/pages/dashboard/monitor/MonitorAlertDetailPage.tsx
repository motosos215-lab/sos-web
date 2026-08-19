import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, FileUp, RefreshCw } from "lucide-react";
import { AlertMessage } from "../../../components/common/AlertMessage/AlertMessage";
import { Button } from "../../../components/common/Button/Button";
import { type EmergencyStatusSummary, getMonitorEmergencyStatus } from "../../../services/emergencyStatusService";
import { downloadEvidence, formatFileSize, uploadEvidence, type EvidenceAttachment } from "../../../services/evidenceService";
import {
  acknowledgeMonitorAlert,
  declineMonitorAlert,
  getMonitorAlertDetails,
  markMonitorAlertViewed,
  type MonitorAlert,
} from "../../../services/monitorAlertService";
import { getApiErrorMessage } from "../../../utils/apiErrors";
import { formatReadableDate, formatRelativeDate } from "../../../utils/dateFormat";
import "../incidents/IncidentDetailPage.css";

export function MonitorAlertDetailPage() {
  const navigate = useNavigate();
  const { alertId } = useParams();
  const notificationDeliveryAttemptId = alertId ?? "";
  const [alert, setAlert] = useState<MonitorAlert | null>(null);
  const [status, setStatus] = useState<EmergencyStatusSummary | null>(null);
  const [uploadedEvidence, setUploadedEvidence] = useState<EvidenceAttachment[]>([]);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [responseMessage, setResponseMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActionRunning, setIsActionRunning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [evidenceType, setEvidenceType] = useState("Photo");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadAlert = useCallback(
    async (refreshing = false) => {
      if (!notificationDeliveryAttemptId) {
        setErrorMessage("La alerta solicitada no es válida.");
        setIsLoading(false);
        return;
      }

      setErrorMessage("");
      setMessage("");

      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const details = await getMonitorAlertDetails(notificationDeliveryAttemptId);
        setAlert(details.alert);
        setStatus(details.status);
      } catch (error) {
        setAlert(null);
        setStatus(null);
        setErrorMessage(getApiErrorMessage(error));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [notificationDeliveryAttemptId],
  );

  useEffect(() => {
    void loadAlert(false);
  }, [loadAlert]);

  const refreshStatus = async () => {
    if (!notificationDeliveryAttemptId) {
      return;
    }

    try {
      setStatus(await getMonitorEmergencyStatus(notificationDeliveryAttemptId));
    } catch {
      setStatus(null);
    }
  };

  const runAlertAction = async (action: () => Promise<MonitorAlert>, successMessage: string) => {
    if (isActionRunning) {
      return;
    }

    setIsActionRunning(true);
    setErrorMessage("");
    setMessage("");

    try {
      setAlert(await action());
      setMessage(successMessage);
      await refreshStatus();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionRunning(false);
    }
  };

  const handleUpload = async () => {
    if (!alert?.incidentId || !selectedFile || isUploading) {
      return;
    }

    setIsUploading(true);
    setErrorMessage("");
    setMessage("");

    try {
      const result = await uploadEvidence({
        role: "monitor",
        incidentId: alert.incidentId,
        alertDispatchId: alert.alertDispatchId,
        file: selectedFile,
        description: evidenceDescription,
        evidenceType,
      });
      setUploadedEvidence((current) => [result.evidenceAttachment, ...current.filter((item) => item.id !== result.evidenceAttachment.id)]);
      setMessage(result.isDuplicate ? "Esta evidencia ya estaba registrada." : "Evidencia registrada correctamente.");
      setSelectedFile(null);
      setEvidenceDescription("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (item: EvidenceAttachment) => {
    setErrorMessage("");

    try {
      const file = await downloadEvidence("monitor", item.id, item.fileName, item);
      const url = URL.createObjectURL(file.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.fileName;
      anchor.rel = "noopener";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  };

  if (isLoading) {
    return (
      <section className="incident-detail-state" aria-busy="true">
        Cargando alerta...
      </section>
    );
  }

  if (!alert) {
    return (
      <section className="incident-detail-state">
        <h1>Alerta no encontrada</h1>
        <p>La alerta solicitada no existe o no está disponible para tu cuenta.</p>
        {errorMessage ? <AlertMessage variant="error">{errorMessage}</AlertMessage> : null}
        <Button onClick={() => navigate("/dashboard/resumen")} type="button">
          Volver al resumen
        </Button>
      </section>
    );
  }

  const actionMessageValid = responseMessage.trim().length <= 300;
  const locationText = status?.location.available
    ? `${status.location.latitude?.toFixed(5)}, ${status.location.longitude?.toFixed(5)}`
    : "Ubicación no disponible";

  return (
    <div className="incident-detail">
      <header className="incident-detail__header">
        <div>
          <Link to="/dashboard/resumen">
            <ArrowLeft aria-hidden="true" size={16} /> Volver
          </Link>
          <h1>Alerta asignada</h1>
          <p>Intento #{alert.notificationDeliveryAttemptId}</p>
        </div>
        <Button
          isLoading={isRefreshing}
          loadingText="Actualizando..."
          onClick={() => void loadAlert(true)}
          type="button"
          variant="secondary"
        >
          <RefreshCw aria-hidden="true" size={16} /> Actualizar
        </Button>
      </header>

      <div className="incident-detail__messages">
        {message ? <AlertMessage variant="success">{message}</AlertMessage> : null}
        {errorMessage ? <AlertMessage variant="error">{errorMessage}</AlertMessage> : null}
      </div>

      <section className="incident-overview" aria-label="Resumen de la alerta">
        <article>
          <span>Estado</span>
          <strong>{alert.status}</strong>
        </article>
        <article>
          <span>Respuesta</span>
          <strong>{alert.responseType}</strong>
        </article>
        <article>
          <span>Atención requerida</span>
          <strong>{status?.requiresAttention ? "Sí" : "No"}</strong>
        </article>
        <article>
          <span>Ubicación</span>
          <strong>{status?.location.available ? "Disponible" : "No disponible"}</strong>
        </article>
      </section>

      <section className="incident-detail__grid">
        <section className="incident-map-preview" aria-labelledby="monitor-location-title">
          <h2 id="monitor-location-title">Ubicación compartida</h2>
          <div className="incident-map-preview__canvas" aria-label="Mapa aproximado de la alerta">
            <span className="incident-map-preview__start" aria-hidden="true" />
            <span className="incident-map-preview__route" aria-hidden="true" />
            <span className="incident-map-preview__marker" aria-hidden="true" />
          </div>
          <p>
            {locationText}. Precisión: {status?.location.accuracyMeters == null ? "Sin información" : `${status.location.accuracyMeters} m`}
            .
          </p>
          <p>Última actualización: {status?.lastUpdatedAtUtc ? formatRelativeDate(status.lastUpdatedAtUtc) : "No disponible"}</p>
        </section>
        <aside className="incident-actions">
          <h2>Respuesta del monitor</h2>
          <label>
            Mensaje opcional
            <textarea maxLength={300} onChange={(event) => setResponseMessage(event.target.value)} value={responseMessage} />
          </label>
          {!actionMessageValid ? <AlertMessage variant="error">El mensaje debe tener máximo 300 caracteres.</AlertMessage> : null}
          <Button
            isLoading={isActionRunning}
            onClick={() =>
              void runAlertAction(() => markMonitorAlertViewed(alert.notificationDeliveryAttemptId), "Alerta marcada como vista.")
            }
            type="button"
            variant="secondary"
          >
            Marcar vista
          </Button>
          <Button
            disabled={!actionMessageValid}
            isLoading={isActionRunning}
            onClick={() =>
              void runAlertAction(
                () => acknowledgeMonitorAlert(alert.notificationDeliveryAttemptId, responseMessage),
                "Confirmaste que puedes apoyar.",
              )
            }
            type="button"
          >
            Puedo apoyar
          </Button>
          <Button
            disabled={!actionMessageValid}
            isLoading={isActionRunning}
            onClick={() =>
              void runAlertAction(
                () => declineMonitorAlert(alert.notificationDeliveryAttemptId, responseMessage),
                "Rechazaste la atención de esta alerta.",
              )
            }
            type="button"
            variant="secondary"
          >
            No puedo apoyar
          </Button>
        </aside>
      </section>

      <section className="incident-panels">
        <article>
          <h2>Información de emergencia</h2>
          <dl>
            <div>
              <dt>Incidente</dt>
              <dd>{alert.incidentId}</dd>
            </div>
            <div>
              <dt>Viaje</dt>
              <dd>{alert.tripId ?? "No disponible"}</dd>
            </div>
            <div>
              <dt>Dispatch</dt>
              <dd>{alert.alertDispatchId}</dd>
            </div>
            <div>
              <dt>Creada</dt>
              <dd>{formatReadableDate(alert.createdAtUtc)}</dd>
            </div>
          </dl>
        </article>
        <article>
          <h2>Estado agregado</h2>
          {status ? (
            <dl>
              <div>
                <dt>Incidente</dt>
                <dd>{status.incident.status}</dd>
              </div>
              <div>
                <dt>Prioridad</dt>
                <dd>{status.alertDispatch?.priority ?? status.incident.riskLevel}</dd>
              </div>
              <div>
                <dt>Notificaciones</dt>
                <dd>
                  {status.notifications.simulatedSent} enviadas · {status.notifications.failed} fallidas
                </dd>
              </div>
              <div>
                <dt>Monitores</dt>
                <dd>
                  {status.acknowledgements.acknowledged} confirmados · {status.acknowledgements.declined} rechazados
                </dd>
              </div>
            </dl>
          ) : (
            <p>El estado agregado no está disponible.</p>
          )}
        </article>
      </section>

      <section className="incident-evidence" aria-labelledby="monitor-evidence-title">
        <header>
          <div>
            <h2 id="monitor-evidence-title">Evidencia del monitor</h2>
            <p>Registra metadatos de archivos permitidos. El backend actual no expone descarga binaria.</p>
          </div>
        </header>
        <div className="incident-evidence__upload">
          <label>
            Archivo
            <input
              accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,image/jpeg,image/png,image/webp,application/pdf,text/plain"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              ref={fileInputRef}
              type="file"
            />
          </label>
          <label>
            Tipo
            <select onChange={(event) => setEvidenceType(event.target.value)} value={evidenceType}>
              <option value="Photo">Foto</option>
              <option value="Document">Documento</option>
              <option value="Other">Otro</option>
            </select>
          </label>
          <label>
            Descripción
            <textarea maxLength={1000} onChange={(event) => setEvidenceDescription(event.target.value)} value={evidenceDescription} />
          </label>
          <Button disabled={!selectedFile} isLoading={isUploading} loadingText="Registrando..." onClick={handleUpload} type="button">
            <FileUp aria-hidden="true" size={16} /> Registrar evidencia
          </Button>
        </div>
        <div className="incident-evidence__list">
          {uploadedEvidence.length === 0 ? <p>No has subido evidencias desde esta sesión.</p> : null}
          {uploadedEvidence.map((item) => (
            <article key={item.id}>
              <div>
                <strong>{item.fileName}</strong>
                <span>
                  {item.evidenceType} · {formatFileSize(item.sizeBytes)} · {item.contentType}
                </span>
              </div>
              <Button onClick={() => void handleDownload(item)} type="button" variant="secondary">
                <Download aria-hidden="true" size={16} /> Descargar ficha
              </Button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
