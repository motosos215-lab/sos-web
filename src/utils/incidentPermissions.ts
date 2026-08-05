import type { SimulatedSession } from "../services/sessionService";
import type { IncidentRecord } from "../types/incident";

export interface IncidentPermissions {
  canViewIncident: boolean;
  canAcknowledge: boolean;
  canRegisterCall: boolean;
  canRegisterMessage: boolean;
  canShareLocation: boolean;
  canNotifyContacts: boolean;
  canStartFollowUp: boolean;
  canMarkSafe: boolean;
  canCloseIncident: boolean;
  canViewAudit: boolean;
}

const noPermissions: IncidentPermissions = {
  canViewIncident: false,
  canAcknowledge: false,
  canRegisterCall: false,
  canRegisterMessage: false,
  canShareLocation: false,
  canNotifyContacts: false,
  canStartFollowUp: false,
  canMarkSafe: false,
  canCloseIncident: false,
  canViewAudit: false,
};

export function getIncidentPermissions(session: SimulatedSession | null, incident: IncidentRecord | null): IncidentPermissions {
  if (!session || !incident) {
    return noPermissions;
  }

  const isClosed = incident.status === "resolved" || incident.status === "cancelled" || Boolean(incident.closure);

  if (session.role === "administrador") {
    return {
      canViewIncident: true,
      canAcknowledge: incident.status === "active",
      canRegisterCall: !isClosed,
      canRegisterMessage: !isClosed,
      canShareLocation: !isClosed && incident.locationSharingAllowed,
      canNotifyContacts: !isClosed,
      canStartFollowUp: incident.status === "acknowledged",
      canMarkSafe: false,
      canCloseIncident: !isClosed && (incident.status === "acknowledged" || incident.status === "in_progress"),
      canViewAudit: true,
    };
  }

  if (session.role === "monitor") {
    return {
      canViewIncident: true,
      canAcknowledge: incident.status === "active",
      canRegisterCall: !isClosed,
      canRegisterMessage: !isClosed,
      canShareLocation: !isClosed && incident.locationSharingAllowed,
      canNotifyContacts: !isClosed,
      canStartFollowUp: incident.status === "acknowledged",
      canMarkSafe: false,
      canCloseIncident: !isClosed && incident.monitorCanClose && (incident.status === "acknowledged" || incident.status === "in_progress"),
      canViewAudit: true,
    };
  }

  if (session.role === "conductor") {
    const ownsIncident = incident.ownerUserId === session.userId;

    return {
      canViewIncident: ownsIncident,
      canAcknowledge: false,
      canRegisterCall: false,
      canRegisterMessage: false,
      canShareLocation: false,
      canNotifyContacts: false,
      canStartFollowUp: false,
      canMarkSafe: ownsIncident && (incident.status === "active" || incident.status === "acknowledged"),
      canCloseIncident: false,
      canViewAudit: false,
    };
  }

  return noPermissions;
}

export function canListIncident(session: SimulatedSession | null, incident: IncidentRecord): boolean {
  if (!session) {
    return false;
  }

  if (session.role === "administrador" || session.role === "monitor") {
    return true;
  }

  return session.role === "conductor" && incident.ownerUserId === session.userId;
}
