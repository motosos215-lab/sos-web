import type { InvitationStatus } from "../../../types/contact";

interface ContactStatusBadgeProps {
  status: InvitationStatus;
}

const statusLabels: Record<InvitationStatus, string> = {
  pending: "Pendiente",
  invited: "Invitado",
  linked: "Vinculado",
  rejected: "Rechazado",
  expired: "Expirado",
  revoked: "Revocado",
};

export function ContactStatusBadge({ status }: ContactStatusBadgeProps) {
  return (
    <span className={`contact-status contact-status--${status}`}>
      <span aria-hidden="true" />
      {statusLabels[status]}
    </span>
  );
}
