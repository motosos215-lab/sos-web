export type ContactPriority = "principal" | "secundario";

export type InvitationChannel = "email" | "sms" | "codigo_enlace";

export type InvitationStatus = "pending" | "invited" | "linked" | "rejected" | "expired" | "revoked";

export interface ContactPermissions {
  realTimeLocation: boolean;
  criticalAlerts: boolean;
  minorIncidents: boolean;
  vitalSigns: boolean;
}

export interface EmergencyContactFormData {
  fullName: string;
  relationship: string;
  phone: string;
  email: string;
  priority: ContactPriority | "";
  invitationChannel: InvitationChannel | "";
  permissions: ContactPermissions;
}

export interface EmergencyContact extends EmergencyContactFormData {
  id: string;
  invitationStatus: InvitationStatus;
  invitationCode: string | null;
  invitationLink: string | null;
  invitationExpiresAt: string | null;
  createdAt: string;
}

export interface EmergencyContactDraft extends EmergencyContactFormData {
  customRelationship: string;
}
