import type { ContactPermissions, EmergencyContact, InvitationChannel, InvitationStatus } from "../types/contact";

function contactsKeyFor(userId: string): string {
  return `motosos.contacts.${userId}`;
}

function resolveUserId(userId?: string): string | null {
  const resolved = userId ?? window.sessionStorage.getItem("motosos.currentUserId");

  return resolved && resolved.length > 0 ? resolved : null;
}

function isInvitationStatus(value: unknown): value is InvitationStatus {
  return (
    value === "pending" ||
    value === "invited" ||
    value === "linked" ||
    value === "rejected" ||
    value === "expired" ||
    value === "revoked"
  );
}

function isInvitationChannel(value: unknown): value is InvitationChannel {
  return value === "email" || value === "sms" || value === "codigo_enlace";
}

function isPermissions(value: unknown): value is ContactPermissions {
  if (!value || typeof value !== "object") {
    return false;
  }

  const permissions = value as Partial<ContactPermissions>;
  return (
    typeof permissions.realTimeLocation === "boolean" &&
    typeof permissions.criticalAlerts === "boolean" &&
    typeof permissions.minorIncidents === "boolean" &&
    typeof permissions.vitalSigns === "boolean"
  );
}

function isEmergencyContact(value: unknown): value is EmergencyContact {
  if (!value || typeof value !== "object") {
    return false;
  }

  const contact = value as Partial<EmergencyContact>;
  return (
    typeof contact.id === "string" &&
    typeof contact.fullName === "string" &&
    typeof contact.relationship === "string" &&
    typeof contact.phone === "string" &&
    typeof contact.email === "string" &&
    (contact.priority === "principal" || contact.priority === "secundario") &&
    isInvitationChannel(contact.invitationChannel) &&
    isPermissions(contact.permissions) &&
    isInvitationStatus(contact.invitationStatus) &&
    (typeof contact.invitationCode === "string" || contact.invitationCode === null) &&
    (typeof contact.invitationLink === "string" || contact.invitationLink === null) &&
    (typeof contact.invitationExpiresAt === "string" || contact.invitationExpiresAt === null) &&
    typeof contact.createdAt === "string"
  );
}

function parseContacts(value: string): EmergencyContact[] {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isEmergencyContact);
  } catch {
    return [];
  }
}

export function getStoredEmergencyContacts(userId?: string): EmergencyContact[] {
  const resolvedUserId = resolveUserId(userId);

  if (!resolvedUserId) {
    return [];
  }

  const storedContacts = window.sessionStorage.getItem(contactsKeyFor(resolvedUserId));

  if (!storedContacts) {
    return [];
  }

  return parseContacts(storedContacts);
}

export function saveStoredEmergencyContacts(userId: string, contacts: EmergencyContact[]): void;
export function saveStoredEmergencyContacts(contacts: EmergencyContact[]): void;
export function saveStoredEmergencyContacts(userIdOrContacts: string | EmergencyContact[], contacts?: EmergencyContact[]) {
  const userId = resolveUserId(typeof userIdOrContacts === "string" ? userIdOrContacts : undefined);
  const source = typeof userIdOrContacts === "string" ? contacts : userIdOrContacts;

  if (userId && source) {
    window.sessionStorage.setItem(contactsKeyFor(userId), JSON.stringify(source));
  }
}

export function upsertStoredEmergencyContact(userId: string, contact: EmergencyContact): EmergencyContact;
export function upsertStoredEmergencyContact(contact: EmergencyContact): EmergencyContact;
export function upsertStoredEmergencyContact(userIdOrContact: string | EmergencyContact, contact?: EmergencyContact) {
  const userId = resolveUserId(typeof userIdOrContact === "string" ? userIdOrContact : undefined);
  const source = typeof userIdOrContact === "string" ? contact : userIdOrContact;

  if (!userId || !source) {
    return source ?? ({} as EmergencyContact);
  }

  const contacts = getStoredEmergencyContacts(userId);
  const nextContacts = contacts.some((current) => current.id === source.id)
    ? contacts.map((current) => (current.id === source.id ? source : current))
    : [...contacts, source];

  saveStoredEmergencyContacts(userId, nextContacts);
  return source;
}

export function getStoredEmergencyContact(userId: string, contactId: string): EmergencyContact | null;
export function getStoredEmergencyContact(contactId: string): EmergencyContact | null;
export function getStoredEmergencyContact(userIdOrContactId: string, contactId?: string): EmergencyContact | null {
  const userId = contactId ? resolveUserId(userIdOrContactId) : resolveUserId();
  const targetId = contactId ?? userIdOrContactId;

  if (!userId) {
    return null;
  }

  return getStoredEmergencyContacts(userId).find((contact) => contact.id === targetId) ?? null;
}

export function removeStoredEmergencyContact(userId: string, contactId: string): void;
export function removeStoredEmergencyContact(contactId: string): void;
export function removeStoredEmergencyContact(userIdOrContactId: string, contactId?: string) {
  const userId = contactId ? resolveUserId(userIdOrContactId) : resolveUserId();
  const targetId = contactId ?? userIdOrContactId;

  if (!userId) {
    return;
  }

  saveStoredEmergencyContacts(userId, getStoredEmergencyContacts(userId).filter((contact) => contact.id !== targetId));
}

export function clearStoredEmergencyContacts(userId?: string) {
  const resolvedUserId = resolveUserId(userId);

  if (resolvedUserId) {
    window.sessionStorage.removeItem(contactsKeyFor(resolvedUserId));
  }
}
