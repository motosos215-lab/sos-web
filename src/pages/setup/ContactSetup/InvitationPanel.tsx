import { QRCodeSVG } from "qrcode.react";
import type { EmergencyContact } from "../../../types/contact";
import { ContactStatusBadge } from "./ContactStatusBadge";
import { InvitationCountdown } from "./InvitationCountdown";

interface InvitationPanelProps {
  contact: EmergencyContact | null;
  isCopyDisabled: boolean;
  isResending: boolean;
  onCopyCode: () => void;
  onCopyLink: () => void;
  onExpire: () => void;
  onResend: () => void;
}

export function InvitationPanel({
  contact,
  isCopyDisabled,
  isResending,
  onCopyCode,
  onCopyLink,
  onExpire,
  onResend,
}: InvitationPanelProps) {
  const hasInvitation = Boolean(contact?.invitationCode && contact.invitationLink && contact.invitationStatus === "invited");

  return (
    <aside className="invitation-panel" aria-labelledby="invitation-panel-title">
      <h2 id="invitation-panel-title">Invitación y vinculación</h2>
      <ol className="invitation-panel__steps">
        <li><strong>Invita al contacto.</strong><span>Envía la invitación por correo electrónico, SMS o comparte el código.</span></li>
        <li><strong>El contacto recibe la invitación.</strong><span>Puede abrir el enlace o ingresar el código en la app.</span></li>
        <li><strong>Descarga MotoSOS y elige modo Monitor.</strong><span>El contacto acepta la invitación desde la aplicación.</span></li>
        <li><strong>Ingresa el código y queda vinculado.</strong><span>El conductor puede revisar el estado desde la web.</span></li>
      </ol>

      <section className="invitation-panel__code" aria-labelledby="invitation-code-title">
        <h3 id="invitation-code-title">Código de vinculación</h3>
        {contact ? <ContactStatusBadge status={contact.invitationStatus} /> : null}
        {hasInvitation && contact?.invitationCode && contact.invitationLink ? (
          <>
            <code>{contact.invitationCode}</code>
            <InvitationCountdown expiresAt={contact.invitationExpiresAt} onExpire={onExpire} />
            <div className="invitation-panel__qr" role="img" aria-label="Código QR con el enlace simulado de invitación">
              <QRCodeSVG value={contact.invitationLink} size={156} />
            </div>
            <div className="invitation-panel__actions">
              <button aria-label="Copiar código de vinculación" disabled={isCopyDisabled} onClick={onCopyCode} type="button">
                Copiar código
              </button>
              <button aria-label="Copiar enlace de invitación" disabled={isCopyDisabled} onClick={onCopyLink} type="button">
                Copiar enlace
              </button>
              <button disabled={isResending} onClick={onResend} type="button">
                {isResending ? "Generando invitación..." : "Reenviar"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p>Aún no has generado una invitación.</p>
            {contact && ["invited", "expired"].includes(contact.invitationStatus) ? (
              <button disabled={isResending} onClick={onResend} type="button">
                {isResending ? "Generando invitación..." : "Reenviar invitación"}
              </button>
            ) : null}
          </>
        )}
      </section>
    </aside>
  );
}
