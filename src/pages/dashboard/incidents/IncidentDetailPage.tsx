import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPinned, RefreshCw } from "lucide-react";
import { AlertMessage } from "../../../components/common/AlertMessage/AlertMessage";
import { Button } from "../../../components/common/Button/Button";
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
import type { IncidentActor, IncidentCallData, IncidentCloseData, IncidentNotifyData, IncidentRecord, IncidentResolution } from "../../../types/incident";
import { formatReadableDate, formatRelativeDate } from "../../../utils/dateFormat";
import { getIncidentPermissions } from "../../../utils/incidentPermissions";
import { BatteryIndicator } from "../../setup/DevicesSetup/BatteryIndicator";
import { ConnectionIndicator } from "../../setup/DevicesSetup/ConnectionIndicator";
import { IncidentSeverityBadge } from "../components/IncidentSeverityBadge";
import { IncidentStatusBadge } from "../components/IncidentStatusBadge";
import "./IncidentDetailPage.css";

type ModalType = "acknowledge" | "call" | "message" | "share" | "notify" | "follow" | "safe" | "close" | "externalMap" | null;

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
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previous?.focus();
    };
  }, [onClose]);
  return <div className="incident-modal__backdrop"><div aria-labelledby="incident-modal-title" aria-modal="true" className="incident-modal" ref={dialogRef} role="dialog" tabIndex={-1}><h2 id="incident-modal-title">{title}</h2>{children}</div></div>;
}

export function IncidentDetailPage() {
  const navigate = useNavigate();
  const session = getSession();
  const { incidentId } = useParams();
  const folio = sanitizeFolio(incidentId);
  const actor = toActor(session);
  const [incident, setIncident] = useState<IncidentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [note, setNote] = useState("");
  const [callResult, setCallResult] = useState<IncidentCallData["result"]>("no_answer");
  const [textMessage, setTextMessage] = useState("Estamos atendiendo tu alerta MotoSOS. Confirma si necesitas ayuda");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [notifyChannel, setNotifyChannel] = useState<IncidentNotifyData["channel"]>("push");
  const [resolution, setResolution] = useState<IncidentResolution>("driver_safe");
  const [confirmedClose, setConfirmedClose] = useState(false);
  const [safeSecondConfirm, setSafeSecondConfirm] = useState(false);
  const permissions = useMemo(() => getIncidentPermissions(session, incident), [session, incident]);

  const loadIncident = async (refreshing = false) => {
    setErrorMessage("");
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    const response = refreshing ? await refreshIncident(folio, session) : await getIncidentById(folio, session);
    if (response.success && response.data) {
      setIncident(response.data);
    } else {
      setIncident(null);
      setErrorMessage(response.message);
    }
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void loadIncident(false);
  }, [folio]);

  const applyResult = (result: { success: boolean; message: string; data: IncidentRecord | null }) => {
    if (result.success && result.data) {
      setIncident(result.data);
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

  if (isLoading) {
    return <section className="incident-detail-state" aria-busy="true">Cargando incidente...</section>;
  }

  if (!incident) {
    return <section className="incident-detail-state"><h1>Incidente no encontrado</h1><p>El folio solicitado no existe o no está disponible para tu cuenta.</p><Button onClick={() => navigate("/dashboard/incidentes")} type="button">Volver a incidentes</Button></section>;
  }

  const linkedLocationContacts = incident.contacts.filter((contact) => contact.invitationStatus === "linked" && contact.canReceiveLocation);
  const linkedAlertContacts = incident.contacts.filter((contact) => contact.invitationStatus === "linked" && contact.canReceiveCriticalAlerts);
  const isClosed = incident.status === "resolved" || incident.status === "cancelled" || Boolean(incident.closure);
  const closeNotesValid = note.trim().length >= 10 && note.trim().length <= 500;
  const callNoteValid = note.trim().length === 0 || note.trim().length <= 300;
  const messageValid = textMessage.trim().length > 0 && textMessage.trim().length <= 300;

  return (
    <div className="incident-detail">
      <header className="incident-detail__header">
        <div><Link to="/dashboard/incidentes"><ArrowLeft aria-hidden="true" size={16} /> Volver</Link><h1>Incidente #{incident.folio}</h1><div><IncidentSeverityBadge severity={incident.severity} /> <IncidentStatusBadge status={incident.status} /></div></div>
        <Button isLoading={isRefreshing} loadingText="Actualizando..." onClick={() => void loadIncident(true)} type="button" variant="secondary"><RefreshCw aria-hidden="true" size={16} /> Actualizar</Button>
      </header>
      <div className="incident-detail__messages">{message ? <AlertMessage variant="success">{message}</AlertMessage> : null}{errorMessage ? <AlertMessage variant="error">{errorMessage}</AlertMessage> : null}</div>

      <section className="incident-overview" aria-label="Resumen superior del incidente">
        <article><span>Estado</span><strong>{incident.status === "active" ? "Alerta activa" : incident.status === "in_progress" ? "En seguimiento" : incident.status === "acknowledged" ? "Confirmado" : "Caso cerrado"}</strong></article>
        <article><span>Tiempo transcurrido</span><strong>{incident.elapsedMinutes} min</strong></article>
        <article><span>Distancia estimada</span><strong>{incident.estimatedDistanceKm === null ? "Sin calcular" : `${incident.estimatedDistanceKm.toFixed(1)} km`}</strong></article>
        <article><span>Origen</span><strong>{getOriginLabel(incident.origin)}</strong></article>
      </section>

      <section className="incident-detail__grid">
        <section className="incident-map-preview" aria-labelledby="incident-map-title"><h2 id="incident-map-title">Ubicación simulada</h2><div className="incident-map-preview__canvas" aria-label="Mapa simulado del incidente"><span className="incident-map-preview__start" aria-hidden="true" /><span className="incident-map-preview__route" aria-hidden="true" /><span className="incident-map-preview__marker" aria-hidden="true"><MapPinned size={22} /></span><div className="incident-map-preview__zoom" aria-hidden="true"><span>+</span><span>-</span></div></div><p>{incident.locationLabel}. Precisión GPS: {incident.device.gpsAccuracyMeters === null ? "Sin información" : `${incident.device.gpsAccuracyMeters} m`}.</p><Button onClick={() => setModal("externalMap")} type="button" variant="secondary">Abrir en mapa externo</Button></section>
        <aside className="incident-actions"><h2>Acciones rápidas</h2>{permissions.canAcknowledge ? <Button onClick={() => setModal("acknowledge")} type="button">Confirmar recepción</Button> : null}{permissions.canRegisterCall ? <Button onClick={() => setModal("call")} type="button" variant="secondary">Llamar al conductor</Button> : null}{permissions.canRegisterMessage ? <Button onClick={() => setModal("message")} type="button" variant="secondary">Enviar mensaje</Button> : null}{permissions.canShareLocation ? <Button onClick={() => { setSelectedContacts(linkedLocationContacts.map((contact) => contact.id)); setModal("share"); }} type="button" variant="secondary">Compartir ubicación</Button> : null}{permissions.canNotifyContacts ? <Button onClick={() => { setSelectedContacts(linkedAlertContacts.map((contact) => contact.id)); setModal("notify"); }} type="button" variant="secondary">Enviar a contactos</Button> : null}{permissions.canStartFollowUp ? <Button onClick={() => setModal("follow")} type="button">Marcar en seguimiento</Button> : null}{permissions.canMarkSafe ? <Button onClick={() => setModal("safe")} type="button">Estoy bien</Button> : null}{permissions.canCloseIncident ? <Button onClick={() => setModal("close")} type="button">Cerrar caso</Button> : null}{isClosed ? <p>Las acciones operativas están desactivadas porque el caso está cerrado.</p> : null}</aside>
      </section>

      <section className="incident-panels">
        <article><h2>Información del incidente</h2><dl><div><dt>Folio</dt><dd>{incident.folio}</dd></div><div><dt>Fecha y hora</dt><dd>{formatReadableDate(incident.occurredAt)}</dd></div><div><dt>Tipo</dt><dd>{incident.incidentType}</dd></div><div><dt>Origen</dt><dd>{getOriginLabel(incident.origin)}</dd></div><div><dt>Ubicación</dt><dd>{incident.locationLabel}</dd></div><div><dt>Última sincronización</dt><dd>{formatRelativeDate(incident.device.lastSynchronization)}</dd></div><div><dt>Monitor asignado</dt><dd>{incident.assignedMonitorName ?? "Sin asignar"}</dd></div></dl></article>
        <article><h2>Información del conductor</h2><div className="incident-driver-avatar" aria-hidden="true">{incident.driver.fullName.slice(0, 1)}</div><dl><div><dt>Nombre</dt><dd>{incident.driver.fullName}</dd></div><div><dt>Teléfono</dt><dd>{incident.driver.phoneMasked}</dd></div><div><dt>Correo</dt><dd>{incident.driver.emailMasked}</dd></div><div><dt>Ciudad</dt><dd>{incident.driver.city}</dd></div><div><dt>Tipo de sangre</dt><dd>{incident.driver.bloodType ?? "No disponible"}</dd></div></dl></article>
        <article><h2>Vehículo</h2><dl><div><dt>Alias</dt><dd>{incident.vehicle.alias}</dd></div><div><dt>Tipo</dt><dd>{incident.vehicle.type}</dd></div><div><dt>Marca</dt><dd>{incident.vehicle.brand}</dd></div><div><dt>Modelo</dt><dd>{incident.vehicle.model}</dd></div><div><dt>Año</dt><dd>{incident.vehicle.year}</dd></div><div><dt>Placa</dt><dd>{incident.vehicle.licensePlateMasked}</dd></div></dl></article>
        <article><h2>Estado de dispositivos</h2><dl><div><dt>Batería móvil</dt><dd><BatteryIndicator level={incident.device.mobileBatteryLevel} /></dd></div><div><dt>Batería smartwatch</dt><dd><BatteryIndicator level={incident.device.smartwatchBatteryLevel} /></dd></div><div><dt>Señal</dt><dd><ConnectionIndicator quality={incident.device.signalStatus} /></dd></div><div><dt>Precisión GPS</dt><dd>{incident.device.gpsAccuracyMeters === null ? "Sin información" : `${incident.device.gpsAccuracyMeters} m`}</dd></div></dl>{incident.device.signalStatus === "offline" ? <AlertMessage variant="warning">El dispositivo no ha sincronizado recientemente</AlertMessage> : null}</article>
      </section>

      {incident.closure ? <section className="closed-summary"><h2>Caso cerrado</h2><p>{formatReadableDate(incident.closure.closedAt)} · {getResolutionLabel(incident.closure.resolution)} · {incident.closure.closedBy} ({incident.closure.closedByRole})</p><p>{incident.closure.notes.slice(0, 180)}</p><Link to="/dashboard/incidentes">Volver al listado</Link></section> : null}

      <section className="incident-timeline" aria-labelledby="incident-timeline-title"><h2 id="incident-timeline-title">Línea de tiempo</h2><ol>{[...incident.timeline].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()).map((entry) => <li key={entry.id}><time>{new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit" }).format(new Date(entry.occurredAt))}</time><div><strong>{entry.title}</strong><p>{entry.description}</p>{entry.performedBy ? <small>{entry.performedBy} · {entry.performedRole}</small> : null}</div></li>)}</ol></section>

      {modal === "acknowledge" ? <Dialog onClose={() => setModal(null)} title="Confirmar recepción"><p>Confirma que has recibido y atenderás esta alerta.</p><div className="incident-modal__actions"><Button onClick={() => setModal(null)} type="button" variant="secondary">Cancelar</Button><Button onClick={() => void acknowledgeIncident(incident.folio, actor, session).then(applyResult)} type="button">Confirmar recepción</Button></div></Dialog> : null}
      {modal === "call" ? <Dialog onClose={() => setModal(null)} title="Registrar intento de llamada"><p>Teléfono oculto: {incident.driver.phoneMasked}</p><label>Resultado<select onChange={(event) => setCallResult(event.target.value as IncidentCallData["result"])} value={callResult}><option value="no_answer">Sin respuesta</option><option value="successful">Contacto exitoso</option><option value="unavailable">Número no disponible</option></select></label><label>Nota<textarea maxLength={300} onChange={(event) => setNote(event.target.value)} value={note} /></label>{!callNoteValid ? <AlertMessage variant="error">La nota debe tener máximo 300 caracteres.</AlertMessage> : null}<div className="incident-modal__actions"><Button onClick={() => setModal(null)} type="button" variant="secondary">Cancelar</Button><Button disabled={!callNoteValid} onClick={() => void registerIncidentCall(incident.folio, { result: callResult, note }, actor, session).then(applyResult)} type="button">Registrar llamada</Button></div></Dialog> : null}
      {modal === "message" ? <Dialog onClose={() => setModal(null)} title="Registrar mensaje simulado"><label>Mensaje<textarea maxLength={300} onChange={(event) => setTextMessage(event.target.value)} value={textMessage} /></label>{!messageValid ? <AlertMessage variant="error">El mensaje es obligatorio y debe tener máximo 300 caracteres.</AlertMessage> : null}<div className="incident-modal__actions"><Button onClick={() => setModal(null)} type="button" variant="secondary">Cancelar</Button><Button disabled={!messageValid} onClick={() => void registerIncidentMessage(incident.folio, { message: textMessage }, actor, session).then(applyResult)} type="button">Registrar mensaje</Button></div></Dialog> : null}
      {modal === "share" ? <Dialog onClose={() => setModal(null)} title="Compartir ubicación"><ContactChecks contacts={linkedLocationContacts} selected={selectedContacts} onChange={setSelectedContacts} />{linkedLocationContacts.length === 0 ? <AlertMessage variant="warning">No hay contactos autorizados disponibles.</AlertMessage> : null}<div className="incident-modal__actions"><Button onClick={() => setModal(null)} type="button" variant="secondary">Cancelar</Button><Button disabled={selectedContacts.length === 0} onClick={() => void shareIncidentLocation(incident.folio, selectedContacts, actor, session).then(applyResult)} type="button">Compartir ubicación</Button></div></Dialog> : null}
      {modal === "notify" ? <Dialog onClose={() => setModal(null)} title="Enviar a contactos"><ContactChecks contacts={linkedAlertContacts} selected={selectedContacts} onChange={setSelectedContacts} /><label>Canal simulado<select onChange={(event) => setNotifyChannel(event.target.value as IncidentNotifyData["channel"])} value={notifyChannel}><option value="push">Push</option><option value="sms">SMS</option><option value="email">Correo</option></select></label>{linkedAlertContacts.length === 0 ? <AlertMessage variant="warning">No hay contactos vinculados disponibles.</AlertMessage> : null}<div className="incident-modal__actions"><Button onClick={() => setModal(null)} type="button" variant="secondary">Cancelar</Button><Button disabled={selectedContacts.length === 0} onClick={() => void notifyIncidentContacts(incident.folio, { contactIds: selectedContacts, channel: notifyChannel }, actor, session).then(applyResult)} type="button">Enviar a contactos</Button></div></Dialog> : null}
      {modal === "follow" ? <Dialog onClose={() => setModal(null)} title="Marcar en seguimiento"><p>El incidente pasará al estado en seguimiento.</p><div className="incident-modal__actions"><Button onClick={() => setModal(null)} type="button" variant="secondary">Cancelar</Button><Button onClick={() => void startIncidentFollowUp(incident.folio, actor, session).then(applyResult)} type="button">Marcar en seguimiento</Button></div></Dialog> : null}
      {modal === "safe" ? <Dialog onClose={() => setModal(null)} title="Confirmar que estás bien"><p>Confirma que no necesitas ayuda y que el incidente fue un falso positivo o no requiere atención.</p>{incident.origin === "manual_sos" && incident.severity === "critical" ? <label className="incident-modal__check"><input checked={safeSecondConfirm} onChange={(event) => setSafeSecondConfirm(event.target.checked)} type="checkbox" /> Confirmo nuevamente que no requiero ayuda aunque fue un SOS crítico.</label> : null}<div className="incident-modal__actions"><Button onClick={() => setModal(null)} type="button" variant="secondary">Cancelar</Button><Button disabled={incident.origin === "manual_sos" && incident.severity === "critical" && !safeSecondConfirm} onClick={() => void markDriverSafe(incident.folio, actor, session).then(applyResult)} type="button">Confirmar que estoy bien</Button></div></Dialog> : null}
      {modal === "close" ? <Dialog onClose={() => setModal(null)} title="Cerrar incidente"><label>Resolución<select onChange={(event) => setResolution(event.target.value as IncidentResolution)} value={resolution}><option value="driver_safe">Conductor a salvo</option><option value="false_positive">Falso positivo</option><option value="assistance_provided">Ayuda proporcionada</option><option value="external_contact_assisted">Contacto externo atendió</option><option value="other">Otro</option></select></label><label>Notas<textarea maxLength={500} onChange={(event) => setNote(event.target.value)} value={note} /></label><label className="incident-modal__check"><input checked={confirmedClose} onChange={(event) => setConfirmedClose(event.target.checked)} type="checkbox" /> Confirmo que el caso puede cerrarse.</label>{!closeNotesValid ? <AlertMessage variant="error">Las notas son obligatorias y deben tener entre 10 y 500 caracteres.</AlertMessage> : null}<div className="incident-modal__actions"><Button onClick={() => setModal(null)} type="button" variant="secondary">Cancelar</Button><Button disabled={!closeNotesValid || !confirmedClose} onClick={() => void closeIncident(incident.folio, { resolution, notes: note } satisfies IncidentCloseData, actor, session).then(applyResult)} type="button">Cerrar incidente</Button></div></Dialog> : null}
      {modal === "externalMap" ? <Dialog onClose={() => setModal(null)} title="Mapa externo"><p>La integración con mapas externos estará disponible cuando backend autorice el intercambio de ubicación.</p><Button onClick={() => setModal(null)} type="button">Entendido</Button></Dialog> : null}
    </div>
  );
}

function ContactChecks({ contacts, onChange, selected }: { contacts: IncidentRecord["contacts"]; onChange: (ids: string[]) => void; selected: string[] }) {
  return <div className="incident-contact-checks">{contacts.map((contact) => <label key={contact.id}><input checked={selected.includes(contact.id)} onChange={(event) => onChange(event.target.checked ? [...selected, contact.id] : selected.filter((id) => id !== contact.id))} type="checkbox" /> <span>{contact.fullName} · {contact.relationship} · {contact.phoneMasked}</span></label>)}</div>;
}
