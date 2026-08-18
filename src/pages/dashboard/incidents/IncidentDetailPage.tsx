import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, FileUp, MapPinned, RefreshCw, Route as RouteIcon } from "lucide-react";
import { AlertMessage } from "../../../components/common/AlertMessage/AlertMessage";
import { Button } from "../../../components/common/Button/Button";
import { getRiderEmergencyStatus, type EmergencyStatusSummary } from "../../../services/emergencyStatusService";
import {
  downloadEvidence,
  formatFileSize,
  listRiderEvidenceByIncident,
  uploadEvidence,
  type EvidenceAttachment,
} from "../../../services/evidenceService";
import {
  acknowledgeIncident,
  closeIncident,
  getIncidentById,
  markDriverSafe,
  notifyIncidentContacts,
  refreshIncident,
  registerIncidentCall,
  registerIncidentMessage,
  shareIncidentLocation,
  startIncidentFollowUp,
} from "../../../services/incidentService";
import { getSession } from "../../../services/sessionService";
import { getTripRoutePreview, type TripRouteSummary } from "../../../services/tripRouteService";
import type {
  IncidentActor,
  IncidentCallData,
  IncidentCloseData,
  IncidentNotifyData,
  IncidentRecord,
  IncidentResolution,
} from "../../../types/incident";
import { getApiErrorMessage } from "../../../utils/apiErrors";
import { formatReadableDate, formatRelativeDate } from "../../../utils/dateFormat";
import { getIncidentPermissions } from "../../../utils/incidentPermissions";
import { BatteryIndicator } from "../../setup/DevicesSetup/BatteryIndicator";
import { ConnectionIndicator } from "../../setup/DevicesSetup/ConnectionIndicator";
import { IncidentSeverityBadge } from "../components/IncidentSeverityBadge";
import { IncidentStatusBadge } from "../components/IncidentStatusBadge";
import "./IncidentDetailPage.css";

type ModalType = "acknowledge" | "call" | "message" | "share" | "notify" | "follow" | "safe" | "close" | "externalMap" | null;
type IncidentActionResult = { success: boolean; message: string; data: IncidentRecord | null };

function sanitizeFolio(value: string | undefined): string {
  return (value ?? "").replace(/[^A-Z0-9-]/gi, "").slice(0, 24);
}

function getOriginLabel(origin: IncidentRecord["origin"]): string {
  return origin === "automatic_detection" ? "Detección automática" : "SOS manual";
}

function getResolutionLabel(resolution: IncidentResolution): string {
  const labels: Record<IncidentResolution, string> = {
    driver_safe: "Conductor a salvo",
    false_positive: "Falso positivo",
    assistance_provided: "Ayuda proporcionada",
    external_contact_assisted: "Contacto externo atendió",
    other: "Otro",
  };
  return labels[resolution];
}

function toActor(session: ReturnType<typeof getSession>): IncidentActor {
  return { userId: session?.userId ?? "unknown", name: session?.name ?? "Usuario MotoSOS", role: session?.role ?? "desconocido" };
}

function Dialog({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const firstFocusable = dialog?.querySelector<HTMLElement>("button, input, select, textarea, [href], [tabindex]:not([tabindex='-1'])");
    (firstFocusable ?? dialog)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialog) {
        return;
      }

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>("button, input, select, textarea, [href], [tabindex]:not([tabindex='-1'])"),
      ).filter((element) => !element.hasAttribute("disabled"));

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previous?.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div className="incident-modal__backdrop">
      <div aria-labelledby="incident-modal-title" aria-modal="true" className="incident-modal" ref={dialogRef} role="dialog" tabIndex={-1}>
        <h2 id="incident-modal-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function IncidentDetailPage() {
  const navigate = useNavigate();
  const session = useMemo(() => getSession(), []);
  const { incidentId } = useParams();
  const folio = sanitizeFolio(incidentId);
  const actor = toActor(session);
  const [incident, setIncident] = useState<IncidentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isActionRunning, setIsActionRunning] = useState(false);
  const [routeSummary, setRouteSummary] = useState<TripRouteSummary | null>(null);
  const [routeMessage, setRouteMessage] = useState("");
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [emergencyStatus, setEmergencyStatus] = useState<EmergencyStatusSummary | null>(null);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceAttachment[]>([]);
  const [evidenceMessage, setEvidenceMessage] = useState("");
  const [isEvidenceLoading, setIsEvidenceLoading] = useState(false);
  const [isEvidenceUploading, setIsEvidenceUploading] = useState(false);
  const [selectedEvidenceFile, setSelectedEvidenceFile] = useState<File | null>(null);
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [evidenceType, setEvidenceType] = useState("Photo");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [note, setNote] = useState("");
  const [callResult, setCallResult] = useState<IncidentCallData["result"]>("no_answer");
  const [textMessage, setTextMessage] = useState("Estamos atendiendo tu alerta MotoSOS. Confirma si necesitas ayuda");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [notifyChannel, setNotifyChannel] = useState<IncidentNotifyData["channel"]>("push");
  const [resolution, setResolution] = useState<IncidentResolution>("driver_safe");
  const [confirmedClose, setConfirmedClose] = useState(false);
  const [safeSecondConfirm, setSafeSecondConfirm] = useState(false);
  const permissions = useMemo(() => getIncidentPermissions(session, incident), [session, incident]);

  const loadRelatedIncidentData = useCallback(
    async (nextIncident: IncidentRecord) => {
      if (session?.role !== "conductor") {
        return;
      }

      setRouteMessage("");
      setEvidenceMessage("");
      setEmergencyStatus(null);
      setEvidenceItems([]);
      setIsRouteLoading(Boolean(nextIncident.tripId));
      setIsEvidenceLoading(true);

      const [statusResult, evidenceResult, routeResult] = await Promise.all([
        getRiderEmergencyStatus(nextIncident.id).catch(() => null),
        listRiderEvidenceByIncident(nextIncident.id).catch(() => null),
        nextIncident.tripId ? getTripRoutePreview(nextIncident.tripId).catch(() => null) : Promise.resolve(null),
      ]);

      setEmergencyStatus(statusResult);
      setEvidenceItems(evidenceResult ?? []);
      setRouteSummary(routeResult);
      setIsRouteLoading(false);
      setIsEvidenceLoading(false);

      if (nextIncident.tripId && !routeResult) {
        setRouteMessage("La ruta del viaje todavía no está disponible para este incidente.");
      }

      if (!evidenceResult) {
        setEvidenceMessage("No pudimos cargar evidencias en este momento.");
      }
    },
    [session?.role],
  );

  const loadIncident = useCallback(
    async (refreshing = false) => {
      setErrorMessage("");
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      try {
        const response = refreshing ? await refreshIncident(folio, session) : await getIncidentById(folio, session);
        if (response.success && response.data) {
          setIncident(response.data);
          void loadRelatedIncidentData(response.data);
        } else {
          setIncident(null);
          setErrorMessage(response.message);
        }
      } catch (error) {
        setIncident(null);
        setErrorMessage(getApiErrorMessage(error));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [folio, loadRelatedIncidentData, session],
  );

  const handleEvidenceUpload = async () => {
    if (!incident || !selectedEvidenceFile || isEvidenceUploading) {
      return;
    }

    setIsEvidenceUploading(true);
    setEvidenceMessage("");
    setErrorMessage("");

    try {
      const result = await uploadEvidence({
        role: "rider",
        incidentId: incident.id,
        file: selectedEvidenceFile,
        description: evidenceDescription,
        evidenceType,
      });
      setEvidenceItems((current) => [result.evidenceAttachment, ...current.filter((item) => item.id !== result.evidenceAttachment.id)]);
      setEvidenceMessage(result.isDuplicate ? "Esta evidencia ya estaba registrada." : "Evidencia subida correctamente.");
      setSelectedEvidenceFile(null);
      setEvidenceDescription("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsEvidenceUploading(false);
    }
  };

  const handleEvidenceDownload = async (item: EvidenceAttachment) => {
    setErrorMessage("");

    try {
      const download = await downloadEvidence("rider", item.id, item.fileName);
      const url = URL.createObjectURL(download.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = download.fileName;
      anchor.rel = "noopener";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  };

  useEffect(() => {
    void loadIncident(false);
  }, [loadIncident]);

  const applyResult = (result: IncidentActionResult) => {
    if (result.success && result.data) {
      setIncident(result.data);
      void loadRelatedIncidentData(result.data);
      setMessage(result.message);
      setErrorMessage("");
      setModal(null);
      setNote("");
      setConfirmedClose(false);
      setSafeSecondConfirm(false);
    } else {
      setErrorMessage(result.message);
    }
  };

  const runIncidentAction = async (action: () => Promise<IncidentActionResult>) => {
    if (isActionRunning) {
      return;
    }

    setIsActionRunning(true);
    setErrorMessage("");
    setMessage("");

    try {
      applyResult(await action());
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsActionRunning(false);
    }
  };

  if (isLoading) {
    return (
      <section className="incident-detail-state" aria-busy="true">
        Cargando incidente...
      </section>
    );
  }

  if (!incident) {
    return (
      <section className="incident-detail-state">
        <h1>Incidente no encontrado</h1>
        <p>El folio solicitado no existe o no está disponible para tu cuenta.</p>
        <Button onClick={() => navigate("/dashboard/incidentes")} type="button">
          Volver a incidentes
        </Button>
      </section>
    );
  }

  const linkedLocationContacts = incident.contacts.filter((contact) => contact.invitationStatus === "linked" && contact.canReceiveLocation);
  const linkedAlertContacts = incident.contacts.filter(
    (contact) => contact.invitationStatus === "linked" && contact.canReceiveCriticalAlerts,
  );
  const isClosed = incident.status === "resolved" || incident.status === "cancelled" || Boolean(incident.closure);
  const closeNotesValid = note.trim().length >= 10 && note.trim().length <= 500;
  const callNoteValid = note.trim().length === 0 || note.trim().length <= 300;
  const messageValid = textMessage.trim().length > 0 && textMessage.trim().length <= 300;

  return (
    <div className="incident-detail">
      <header className="incident-detail__header">
        <div>
          <Link to="/dashboard/incidentes">
            <ArrowLeft aria-hidden="true" size={16} /> Volver
          </Link>
          <h1>Incidente #{incident.folio}</h1>
          <div>
            <IncidentSeverityBadge severity={incident.severity} /> <IncidentStatusBadge status={incident.status} />
          </div>
        </div>
        <Button
          isLoading={isRefreshing}
          loadingText="Actualizando..."
          onClick={() => void loadIncident(true)}
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

      <section className="incident-overview" aria-label="Resumen superior del incidente">
        <article>
          <span>Estado</span>
          <strong>
            {incident.status === "active"
              ? "Alerta activa"
              : incident.status === "in_progress"
                ? "En seguimiento"
                : incident.status === "acknowledged"
                  ? "Confirmado"
                  : "Caso cerrado"}
          </strong>
        </article>
        <article>
          <span>Tiempo transcurrido</span>
          <strong>{incident.elapsedMinutes} min</strong>
        </article>
        <article>
          <span>Distancia estimada</span>
          <strong>{incident.estimatedDistanceKm === null ? "Sin calcular" : `${incident.estimatedDistanceKm.toFixed(1)} km`}</strong>
        </article>
        <article>
          <span>Origen</span>
          <strong>{getOriginLabel(incident.origin)}</strong>
        </article>
      </section>

      <section className="incident-detail__grid">
        <section className="incident-map-preview" aria-labelledby="incident-map-title">
          <h2 id="incident-map-title">Ubicación del incidente</h2>
          <div className="incident-map-preview__canvas" aria-label="Mapa del incidente">
            <span className="incident-map-preview__start" aria-hidden="true" />
            <span className="incident-map-preview__route" aria-hidden="true" />
            <span className="incident-map-preview__marker" aria-hidden="true">
              <MapPinned size={22} />
            </span>
            <div className="incident-map-preview__zoom" aria-hidden="true">
              <span>+</span>
              <span>-</span>
            </div>
          </div>
          <p>
            {incident.locationLabel}. Precisión GPS:{" "}
            {incident.device.gpsAccuracyMeters === null ? "Sin información" : `${incident.device.gpsAccuracyMeters} m`}.
          </p>
          <div className="incident-route-summary" aria-live="polite">
            <RouteIcon aria-hidden="true" size={18} />
            {isRouteLoading ? (
              <span>Cargando ruta real del viaje...</span>
            ) : routeSummary && routeSummary.returnedPoints > 0 ? (
              <span>
                Ruta real disponible: {routeSummary.returnedPoints} de {routeSummary.totalPoints} puntos GPS.
                <small>
                  Inicio {routeSummary.points[0]?.latitude.toFixed(5)}, {routeSummary.points[0]?.longitude.toFixed(5)} · Último{" "}
                  {routeSummary.points[routeSummary.points.length - 1]?.latitude.toFixed(5)},{" "}
                  {routeSummary.points[routeSummary.points.length - 1]?.longitude.toFixed(5)}
                </small>
              </span>
            ) : (
              <span>{routeMessage || "Sin ruta GPS registrada para este incidente."}</span>
            )}
          </div>
          <Button onClick={() => setModal("externalMap")} type="button" variant="secondary">
            Abrir en mapa externo
          </Button>
        </section>
        <aside className="incident-actions">
          <h2>Acciones rápidas</h2>
          {permissions.canAcknowledge ? (
            <Button onClick={() => setModal("acknowledge")} type="button">
              Confirmar recepción
            </Button>
          ) : null}
          {permissions.canRegisterCall ? (
            <Button onClick={() => setModal("call")} type="button" variant="secondary">
              Llamar al conductor
            </Button>
          ) : null}
          {permissions.canRegisterMessage ? (
            <Button onClick={() => setModal("message")} type="button" variant="secondary">
              Enviar mensaje
            </Button>
          ) : null}
          {permissions.canShareLocation ? (
            <Button
              onClick={() => {
                setSelectedContacts(linkedLocationContacts.map((contact) => contact.id));
                setModal("share");
              }}
              type="button"
              variant="secondary"
            >
              Compartir ubicación
            </Button>
          ) : null}
          {permissions.canNotifyContacts ? (
            <Button
              onClick={() => {
                setSelectedContacts(linkedAlertContacts.map((contact) => contact.id));
                setModal("notify");
              }}
              type="button"
              variant="secondary"
            >
              Enviar a contactos
            </Button>
          ) : null}
          {permissions.canStartFollowUp ? (
            <Button onClick={() => setModal("follow")} type="button">
              Marcar en seguimiento
            </Button>
          ) : null}
          {permissions.canMarkSafe ? (
            <Button onClick={() => setModal("safe")} type="button">
              Estoy bien
            </Button>
          ) : null}
          {permissions.canCloseIncident ? (
            <Button onClick={() => setModal("close")} type="button">
              Cerrar caso
            </Button>
          ) : null}
          {isClosed ? <p>Las acciones operativas están desactivadas porque el caso está cerrado.</p> : null}
        </aside>
      </section>

      <section className="incident-panels">
        <article>
          <h2>Información del incidente</h2>
          <dl>
            <div>
              <dt>Folio</dt>
              <dd>{incident.folio}</dd>
            </div>
            <div>
              <dt>Fecha y hora</dt>
              <dd>{formatReadableDate(incident.occurredAt)}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>{incident.incidentType}</dd>
            </div>
            <div>
              <dt>Origen</dt>
              <dd>{getOriginLabel(incident.origin)}</dd>
            </div>
            <div>
              <dt>Ubicación</dt>
              <dd>{incident.locationLabel}</dd>
            </div>
            <div>
              <dt>Última sincronización</dt>
              <dd>{formatRelativeDate(incident.device.lastSynchronization)}</dd>
            </div>
            <div>
              <dt>Monitor asignado</dt>
              <dd>{incident.assignedMonitorName ?? "Sin asignar"}</dd>
            </div>
          </dl>
        </article>
        <article>
          <h2>Información del conductor</h2>
          <div className="incident-driver-avatar" aria-hidden="true">
            {incident.driver.fullName.slice(0, 1)}
          </div>
          <dl>
            <div>
              <dt>Nombre</dt>
              <dd>{incident.driver.fullName}</dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>{incident.driver.phoneMasked}</dd>
            </div>
            <div>
              <dt>Correo</dt>
              <dd>{incident.driver.emailMasked}</dd>
            </div>
            <div>
              <dt>Ciudad</dt>
              <dd>{incident.driver.city}</dd>
            </div>
            <div>
              <dt>Tipo de sangre</dt>
              <dd>{incident.driver.bloodType ?? "No disponible"}</dd>
            </div>
          </dl>
        </article>
        <article>
          <h2>Vehículo</h2>
          <dl>
            <div>
              <dt>Alias</dt>
              <dd>{incident.vehicle.alias}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>{incident.vehicle.type}</dd>
            </div>
            <div>
              <dt>Marca</dt>
              <dd>{incident.vehicle.brand}</dd>
            </div>
            <div>
              <dt>Modelo</dt>
              <dd>{incident.vehicle.model}</dd>
            </div>
            <div>
              <dt>Año</dt>
              <dd>{incident.vehicle.year}</dd>
            </div>
            <div>
              <dt>Placa</dt>
              <dd>{incident.vehicle.licensePlateMasked}</dd>
            </div>
          </dl>
        </article>
        <article>
          <h2>Estado de dispositivos</h2>
          <dl>
            <div>
              <dt>Batería móvil</dt>
              <dd>
                <BatteryIndicator level={incident.device.mobileBatteryLevel} />
              </dd>
            </div>
            <div>
              <dt>Batería smartwatch</dt>
              <dd>
                <BatteryIndicator level={incident.device.smartwatchBatteryLevel} />
              </dd>
            </div>
            <div>
              <dt>Señal</dt>
              <dd>
                <ConnectionIndicator quality={incident.device.signalStatus} />
              </dd>
            </div>
            <div>
              <dt>Precisión GPS</dt>
              <dd>{incident.device.gpsAccuracyMeters === null ? "Sin información" : `${incident.device.gpsAccuracyMeters} m`}</dd>
            </div>
          </dl>
          {incident.device.signalStatus === "offline" ? (
            <AlertMessage variant="warning">El dispositivo no ha sincronizado recientemente</AlertMessage>
          ) : null}
        </article>
        <article>
          <h2>Estado operativo</h2>
          {emergencyStatus ? (
            <dl>
              <div>
                <dt>Estado general</dt>
                <dd>{emergencyStatus.overallStatus}</dd>
              </div>
              <div>
                <dt>Requiere atención</dt>
                <dd>{emergencyStatus.requiresAttention ? "Sí" : "No"}</dd>
              </div>
              <div>
                <dt>Notificaciones</dt>
                <dd>
                  {emergencyStatus.notifications.simulatedSent} enviadas · {emergencyStatus.notifications.failed} fallidas
                </dd>
              </div>
              <div>
                <dt>Respuestas de monitores</dt>
                <dd>
                  {emergencyStatus.acknowledgements.acknowledged} confirmadas · {emergencyStatus.acknowledgements.declined} rechazadas
                </dd>
              </div>
              <div>
                <dt>Ubicación compartida</dt>
                <dd>
                  {emergencyStatus.location.available
                    ? `${emergencyStatus.location.latitude?.toFixed(5)}, ${emergencyStatus.location.longitude?.toFixed(5)}`
                    : "No disponible"}
                </dd>
              </div>
            </dl>
          ) : (
            <p>El resumen operativo todavía no está disponible para este incidente.</p>
          )}
        </article>
      </section>

      <section className="incident-evidence" aria-labelledby="incident-evidence-title">
        <header>
          <div>
            <h2 id="incident-evidence-title">Evidencias</h2>
            <p>Archivos protegidos por permisos del backend. MotoSOS no expone URLs públicas de storage.</p>
          </div>
        </header>
        {evidenceMessage ? (
          <AlertMessage variant={evidenceMessage.includes("correctamente") ? "success" : "warning"}>{evidenceMessage}</AlertMessage>
        ) : null}
        <div className="incident-evidence__upload">
          <label>
            Archivo
            <input
              accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,image/jpeg,image/png,image/webp,application/pdf,text/plain"
              onChange={(event) => setSelectedEvidenceFile(event.target.files?.[0] ?? null)}
              ref={fileInputRef}
              type="file"
            />
          </label>
          <label>
            Tipo
            <select onChange={(event) => setEvidenceType(event.target.value)} value={evidenceType}>
              <option value="Photo">Foto</option>
              <option value="Document">Documento</option>
              <option value="Text">Texto</option>
            </select>
          </label>
          <label>
            Descripción
            <textarea
              maxLength={1000}
              onChange={(event) => setEvidenceDescription(event.target.value)}
              placeholder="Ej. Foto del lugar del incidente"
              value={evidenceDescription}
            />
          </label>
          <Button
            disabled={!selectedEvidenceFile}
            isLoading={isEvidenceUploading}
            loadingText="Subiendo..."
            onClick={handleEvidenceUpload}
            type="button"
          >
            <FileUp aria-hidden="true" size={16} /> Subir evidencia
          </Button>
        </div>
        <div className="incident-evidence__list" aria-busy={isEvidenceLoading}>
          {isEvidenceLoading ? <p>Cargando evidencias...</p> : null}
          {!isEvidenceLoading && evidenceItems.length === 0 ? <p>No hay evidencias registradas para este incidente.</p> : null}
          {evidenceItems.map((item) => (
            <article key={item.id}>
              <div>
                <strong>{item.fileName}</strong>
                <span>
                  {item.evidenceType} · {formatFileSize(item.sizeBytes)} · {item.contentType}
                </span>
                {item.description ? <p>{item.description}</p> : null}
              </div>
              <Button onClick={() => void handleEvidenceDownload(item)} type="button" variant="secondary">
                <Download aria-hidden="true" size={16} /> Descargar
              </Button>
            </article>
          ))}
        </div>
      </section>

      {incident.closure ? (
        <section className="closed-summary">
          <h2>Caso cerrado</h2>
          <p>
            {formatReadableDate(incident.closure.closedAt)} · {getResolutionLabel(incident.closure.resolution)} ·{" "}
            {incident.closure.closedBy} ({incident.closure.closedByRole})
          </p>
          <p>{incident.closure.notes.slice(0, 180)}</p>
          <Link to="/dashboard/incidentes">Volver al listado</Link>
        </section>
      ) : null}

      <section className="incident-timeline" aria-labelledby="incident-timeline-title">
        <h2 id="incident-timeline-title">Línea de tiempo</h2>
        <ol>
          {[...incident.timeline]
            .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())
            .map((entry) => (
              <li key={entry.id}>
                <time>{new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit" }).format(new Date(entry.occurredAt))}</time>
                <div>
                  <strong>{entry.title}</strong>
                  <p>{entry.description}</p>
                  {entry.performedBy ? (
                    <small>
                      {entry.performedBy} · {entry.performedRole}
                    </small>
                  ) : null}
                </div>
              </li>
            ))}
        </ol>
      </section>

      {modal === "acknowledge" ? (
        <Dialog onClose={() => setModal(null)} title="Confirmar recepción">
          <p>Confirma que has recibido y atenderás esta alerta.</p>
          <div className="incident-modal__actions">
            <Button onClick={() => setModal(null)} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button
              isLoading={isActionRunning}
              onClick={() => void runIncidentAction(() => acknowledgeIncident(incident.folio, actor, session))}
              type="button"
            >
              Confirmar recepción
            </Button>
          </div>
        </Dialog>
      ) : null}
      {modal === "call" ? (
        <Dialog onClose={() => setModal(null)} title="Registrar intento de llamada">
          <p>Teléfono oculto: {incident.driver.phoneMasked}</p>
          <label>
            Resultado
            <select onChange={(event) => setCallResult(event.target.value as IncidentCallData["result"])} value={callResult}>
              <option value="no_answer">Sin respuesta</option>
              <option value="successful">Contacto exitoso</option>
              <option value="unavailable">Número no disponible</option>
            </select>
          </label>
          <label>
            Nota
            <textarea maxLength={300} onChange={(event) => setNote(event.target.value)} value={note} />
          </label>
          {!callNoteValid ? <AlertMessage variant="error">La nota debe tener máximo 300 caracteres.</AlertMessage> : null}
          <div className="incident-modal__actions">
            <Button onClick={() => setModal(null)} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button
              disabled={!callNoteValid}
              isLoading={isActionRunning}
              onClick={() =>
                void runIncidentAction(() => registerIncidentCall(incident.folio, { result: callResult, note }, actor, session))
              }
              type="button"
            >
              Registrar llamada
            </Button>
          </div>
        </Dialog>
      ) : null}
      {modal === "message" ? (
        <Dialog onClose={() => setModal(null)} title="Registrar mensaje">
          <label>
            Mensaje
            <textarea maxLength={300} onChange={(event) => setTextMessage(event.target.value)} value={textMessage} />
          </label>
          {!messageValid ? (
            <AlertMessage variant="error">El mensaje es obligatorio y debe tener máximo 300 caracteres.</AlertMessage>
          ) : null}
          <div className="incident-modal__actions">
            <Button onClick={() => setModal(null)} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button
              disabled={!messageValid}
              isLoading={isActionRunning}
              onClick={() =>
                void runIncidentAction(() => registerIncidentMessage(incident.folio, { message: textMessage }, actor, session))
              }
              type="button"
            >
              Registrar mensaje
            </Button>
          </div>
        </Dialog>
      ) : null}
      {modal === "share" ? (
        <Dialog onClose={() => setModal(null)} title="Compartir ubicación">
          <ContactChecks contacts={linkedLocationContacts} selected={selectedContacts} onChange={setSelectedContacts} />
          {linkedLocationContacts.length === 0 ? (
            <AlertMessage variant="warning">No hay contactos autorizados disponibles.</AlertMessage>
          ) : null}
          <div className="incident-modal__actions">
            <Button onClick={() => setModal(null)} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button
              disabled={selectedContacts.length === 0}
              isLoading={isActionRunning}
              onClick={() => void runIncidentAction(() => shareIncidentLocation(incident.folio, selectedContacts, actor, session))}
              type="button"
            >
              Compartir ubicación
            </Button>
          </div>
        </Dialog>
      ) : null}
      {modal === "notify" ? (
        <Dialog onClose={() => setModal(null)} title="Enviar a contactos">
          <ContactChecks contacts={linkedAlertContacts} selected={selectedContacts} onChange={setSelectedContacts} />
          <label>
            Canal
            <select onChange={(event) => setNotifyChannel(event.target.value as IncidentNotifyData["channel"])} value={notifyChannel}>
              <option value="push">Push</option>
              <option value="sms">SMS</option>
              <option value="email">Correo</option>
            </select>
          </label>
          {linkedAlertContacts.length === 0 ? (
            <AlertMessage variant="warning">No hay contactos vinculados disponibles.</AlertMessage>
          ) : null}
          <div className="incident-modal__actions">
            <Button onClick={() => setModal(null)} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button
              disabled={selectedContacts.length === 0}
              isLoading={isActionRunning}
              onClick={() =>
                void runIncidentAction(() =>
                  notifyIncidentContacts(incident.folio, { contactIds: selectedContacts, channel: notifyChannel }, actor, session),
                )
              }
              type="button"
            >
              Enviar a contactos
            </Button>
          </div>
        </Dialog>
      ) : null}
      {modal === "follow" ? (
        <Dialog onClose={() => setModal(null)} title="Marcar en seguimiento">
          <p>El incidente pasará al estado en seguimiento.</p>
          <div className="incident-modal__actions">
            <Button onClick={() => setModal(null)} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button
              isLoading={isActionRunning}
              onClick={() => void runIncidentAction(() => startIncidentFollowUp(incident.folio, actor, session))}
              type="button"
            >
              Marcar en seguimiento
            </Button>
          </div>
        </Dialog>
      ) : null}
      {modal === "safe" ? (
        <Dialog onClose={() => setModal(null)} title="Confirmar que estás bien">
          <p>Confirma que no necesitas ayuda y que el incidente fue un falso positivo o no requiere atención.</p>
          {incident.origin === "manual_sos" && incident.severity === "critical" ? (
            <label className="incident-modal__check">
              <input checked={safeSecondConfirm} onChange={(event) => setSafeSecondConfirm(event.target.checked)} type="checkbox" />{" "}
              Confirmo nuevamente que no requiero ayuda aunque fue un SOS crítico.
            </label>
          ) : null}
          <div className="incident-modal__actions">
            <Button onClick={() => setModal(null)} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button
              disabled={incident.origin === "manual_sos" && incident.severity === "critical" && !safeSecondConfirm}
              isLoading={isActionRunning}
              onClick={() => void runIncidentAction(() => markDriverSafe(incident.folio, actor, session))}
              type="button"
            >
              Confirmar que estoy bien
            </Button>
          </div>
        </Dialog>
      ) : null}
      {modal === "close" ? (
        <Dialog onClose={() => setModal(null)} title="Cerrar incidente">
          <label>
            Resolución
            <select onChange={(event) => setResolution(event.target.value as IncidentResolution)} value={resolution}>
              <option value="driver_safe">Conductor a salvo</option>
              <option value="false_positive">Falso positivo</option>
              <option value="assistance_provided">Ayuda proporcionada</option>
              <option value="external_contact_assisted">Contacto externo atendió</option>
              <option value="other">Otro</option>
            </select>
          </label>
          <label>
            Notas
            <textarea maxLength={500} onChange={(event) => setNote(event.target.value)} value={note} />
          </label>
          <label className="incident-modal__check">
            <input checked={confirmedClose} onChange={(event) => setConfirmedClose(event.target.checked)} type="checkbox" /> Confirmo que el
            caso puede cerrarse.
          </label>
          {!closeNotesValid ? (
            <AlertMessage variant="error">Las notas son obligatorias y deben tener entre 10 y 500 caracteres.</AlertMessage>
          ) : null}
          <div className="incident-modal__actions">
            <Button onClick={() => setModal(null)} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button
              disabled={!closeNotesValid || !confirmedClose}
              isLoading={isActionRunning}
              onClick={() =>
                void runIncidentAction(() =>
                  closeIncident(incident.folio, { resolution, notes: note } satisfies IncidentCloseData, actor, session),
                )
              }
              type="button"
            >
              Cerrar incidente
            </Button>
          </div>
        </Dialog>
      ) : null}
      {modal === "externalMap" ? (
        <Dialog onClose={() => setModal(null)} title="Mapa externo">
          <p>Usa las coordenadas y la ubicación registradas en esta pantalla para dar seguimiento al incidente.</p>
          <Button onClick={() => setModal(null)} type="button">
            Entendido
          </Button>
        </Dialog>
      ) : null}
    </div>
  );
}

function ContactChecks({
  contacts,
  onChange,
  selected,
}: {
  contacts: IncidentRecord["contacts"];
  onChange: (ids: string[]) => void;
  selected: string[];
}) {
  return (
    <div className="incident-contact-checks">
      {contacts.map((contact) => (
        <label key={contact.id}>
          <input
            checked={selected.includes(contact.id)}
            onChange={(event) => onChange(event.target.checked ? [...selected, contact.id] : selected.filter((id) => id !== contact.id))}
            type="checkbox"
          />{" "}
          <span>
            {contact.fullName} · {contact.relationship} · {contact.phoneMasked}
          </span>
        </label>
      ))}
    </div>
  );
}
