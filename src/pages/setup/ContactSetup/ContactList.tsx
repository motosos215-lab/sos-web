import type { EmergencyContact } from "../../../types/contact";
import { ContactStatusBadge } from "./ContactStatusBadge";

interface ContactListProps {
  contacts: EmergencyContact[];
  onCopy: (contact: EmergencyContact) => void;
  onDelete: (contact: EmergencyContact) => void;
  onEdit: (contact: EmergencyContact) => void;
  onResend: (contact: EmergencyContact) => void;
  onRevoke: (contact: EmergencyContact) => void;
  onSend: (contact: EmergencyContact) => void;
  onSimulateLink: (contact: EmergencyContact) => void;
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "C";
}

function PermissionValue({ value }: { value: boolean }) {
  return <span className={`contact-permission-value ${value ? "contact-permission-value--on" : ""}`}>{value ? "Sí" : "No"}</span>;
}

function ContactActions({
  contact,
  onCopy,
  onDelete,
  onEdit,
  onResend,
  onRevoke,
  onSend,
  onSimulateLink,
}: ContactListProps & { contact: EmergencyContact }) {
  const hasActiveInvitation = Boolean(contact.invitationCode && contact.invitationLink && contact.invitationStatus === "invited");
  const canEdit = contact.invitationStatus !== "revoked";
  const canDelete = ["pending", "rejected", "expired", "revoked"].includes(contact.invitationStatus);

  return (
    <div className="contact-actions">
      <button disabled={!canEdit} onClick={() => onEdit(contact)} type="button">
        Editar
      </button>
      <button disabled={contact.invitationStatus !== "pending"} onClick={() => onSend(contact)} type="button">
        Enviar invitación
      </button>
      <button disabled={!(["invited", "expired"].includes(contact.invitationStatus))} onClick={() => onResend(contact)} type="button">
        Reenviar invitación
      </button>
      <button disabled={!hasActiveInvitation} onClick={() => onCopy(contact)} type="button">
        Copiar código
      </button>
      <button disabled={contact.invitationStatus !== "invited"} onClick={() => onSimulateLink(contact)} type="button">
        Simular aceptación
      </button>
      <button disabled={!(["invited", "linked"].includes(contact.invitationStatus))} onClick={() => onRevoke(contact)} type="button">
        Revocar acceso
      </button>
      <button disabled={!canDelete} onClick={() => onDelete(contact)} type="button">
        Eliminar
      </button>
    </div>
  );
}

export function ContactList(props: ContactListProps) {
  if (props.contacts.length === 0) {
    return (
      <section className="contacts-empty" aria-labelledby="contacts-empty-title">
        <h2 id="contacts-empty-title">Aún no tienes contactos registrados</h2>
        <p>Agrega un contacto de emergencia para generar una invitación y continuar con la configuración.</p>
      </section>
    );
  }

  return (
    <section className="contacts-list" aria-labelledby="contacts-list-title">
      <h2 id="contacts-list-title">Contactos registrados</h2>
      <div className="contacts-table" role="table" aria-label="Contactos de emergencia registrados">
        <div className="contacts-table__header" role="row">
          <span role="columnheader">Contacto</span>
          <span role="columnheader">Parentesco</span>
          <span role="columnheader">Teléfono</span>
          <span role="columnheader">Correo electrónico</span>
          <span role="columnheader">Estado</span>
          <span role="columnheader">Ubicación</span>
          <span role="columnheader">Críticas</span>
          <span role="columnheader">Menores</span>
          <span role="columnheader">Vitales</span>
          <span role="columnheader">Acciones</span>
        </div>
        {props.contacts.map((contact) => (
          <article className="contacts-table__row" key={contact.id} role="row">
            <div className="contacts-table__person" role="cell" data-label="Contacto">
              <span className="contacts-table__avatar" aria-hidden="true">{getInitials(contact.fullName)}</span>
              <span>
                <strong>{contact.fullName}</strong>
                {contact.priority === "principal" ? <small>Principal</small> : null}
              </span>
            </div>
            <span role="cell" data-label="Parentesco">{contact.relationship}</span>
            <span role="cell" data-label="Teléfono">{contact.phone}</span>
            <span role="cell" data-label="Correo">{contact.email}</span>
            <span role="cell" data-label="Estado"><ContactStatusBadge status={contact.invitationStatus} /></span>
            <span role="cell" data-label="Ubicación"><PermissionValue value={contact.permissions.realTimeLocation} /></span>
            <span role="cell" data-label="Críticas"><PermissionValue value={contact.permissions.criticalAlerts} /></span>
            <span role="cell" data-label="Menores"><PermissionValue value={contact.permissions.minorIncidents} /></span>
            <span role="cell" data-label="Vitales"><PermissionValue value={contact.permissions.vitalSigns} /></span>
            <div role="cell" data-label="Acciones">
              <ContactActions {...props} contact={contact} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
