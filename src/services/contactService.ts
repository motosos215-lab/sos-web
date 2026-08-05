import type { EmergencyContact, EmergencyContactFormData, InvitationStatus } from "../types/contact";
import {
  getStoredEmergencyContact,
  removeStoredEmergencyContact,
  upsertStoredEmergencyContact,
} from "./contactStorageService";

export interface ContactAvailabilityRequest {
  email: string;
  phone: string;
}

export interface ContactAvailabilityResponse {
  success: boolean;
  duplicateField: "email" | "phone" | null;
  message: string;
}

export interface SaveEmergencyContactResponse {
  success: boolean;
  message: string;
  data: {
    contactId: string;
    invitationStatus: InvitationStatus;
  } | null;
}

export interface InvitationResponse {
  success: boolean;
  message: string;
  data: {
    invitationCode: string;
    invitationLink: string;
    invitationStatus: "invited";
    expiresAt: string;
  } | null;
}

export interface ContactActionResponse {
  success: boolean;
  message: string;
  data: EmergencyContact | null;
}

const DUPLICATE_EMAIL = "contacto@motosos.test";
const DUPLICATE_PHONE_DIGITS = "5210000000000";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function normalizePhoneDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

function getRandomIndex(maxExclusive: number, fallbackSeed: number) {
  if (window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] % maxExclusive;
  }

  return fallbackSeed % maxExclusive;
}

function generateCodeSegment(seedOffset: number) {
  let segment = "";
  const fallbackSeed = Date.now() + seedOffset;

  for (let index = 0; index < 4; index += 1) {
    segment += CODE_ALPHABET[getRandomIndex(CODE_ALPHABET.length, fallbackSeed + index * 17)];
  }

  return segment;
}

function generateInvitationCode() {
  return [generateCodeSegment(11), generateCodeSegment(37), generateCodeSegment(73)].join("-");
}

function buildInvitationPayload(): NonNullable<InvitationResponse["data"]> {
  const invitationCode = generateInvitationCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  return {
    invitationCode,
    invitationLink: `https://motosos.local/invitacion/${invitationCode}`,
    invitationStatus: "invited",
    expiresAt,
  };
}

export async function checkContactAvailability(
  data: ContactAvailabilityRequest,
): Promise<ContactAvailabilityResponse> {
  await wait(350);

  if (data.email.trim().toLowerCase() === DUPLICATE_EMAIL) {
    return {
      success: false,
      duplicateField: "email",
      message: "Este correo ya está registrado como contacto",
    };
  }

  if (normalizePhoneDigits(data.phone) === DUPLICATE_PHONE_DIGITS) {
    return {
      success: false,
      duplicateField: "phone",
      message: "Este teléfono ya está registrado como contacto",
    };
  }

  return {
    success: true,
    duplicateField: null,
    message: "Contacto disponible",
  };
}

export async function saveEmergencyContact(
  _data: EmergencyContactFormData,
): Promise<SaveEmergencyContactResponse> {
  await wait(800);

  return {
    success: true,
    message: "Contacto guardado correctamente",
    data: {
      contactId: "contact-demo-001",
      invitationStatus: "pending",
    },
  };
}

export async function updateEmergencyContact(
  id: string,
  data: EmergencyContactFormData,
): Promise<ContactActionResponse> {
  await wait(500);
  const storedContact = getStoredEmergencyContact(id);

  if (!storedContact) {
    return { success: false, message: "No encontramos el contacto", data: null };
  }

  const sensitiveDestinationChanged = storedContact.email !== data.email || storedContact.phone !== data.phone;
  const nextContact: EmergencyContact = {
    ...storedContact,
    ...data,
    invitationStatus: sensitiveDestinationChanged ? "pending" : storedContact.invitationStatus,
    invitationCode: sensitiveDestinationChanged ? null : storedContact.invitationCode,
    invitationLink: sensitiveDestinationChanged ? null : storedContact.invitationLink,
    invitationExpiresAt: sensitiveDestinationChanged ? null : storedContact.invitationExpiresAt,
  };

  upsertStoredEmergencyContact(nextContact);

  return {
    success: true,
    message: "Contacto actualizado correctamente",
    data: nextContact,
  };
}

export async function sendContactInvitation(contact: EmergencyContact): Promise<InvitationResponse> {
  await wait(650);

  return {
    success: true,
    message: "Invitación generada correctamente",
    data: buildInvitationPayload(),
  };
}

export async function resendContactInvitation(contactId: string): Promise<InvitationResponse> {
  const contact = getStoredEmergencyContact(contactId);

  if (!contact) {
    return { success: false, message: "No encontramos el contacto", data: null };
  }

  return sendContactInvitation(contact);
}

export async function revokeContactInvitation(contactId: string): Promise<ContactActionResponse> {
  await wait(500);
  const contact = getStoredEmergencyContact(contactId);

  if (!contact) {
    return { success: false, message: "No encontramos el contacto", data: null };
  }

  const nextContact: EmergencyContact = {
    ...contact,
    invitationStatus: "revoked",
    invitationCode: null,
    invitationLink: null,
    invitationExpiresAt: null,
  };

  upsertStoredEmergencyContact(nextContact);

  return { success: true, message: "Acceso revocado correctamente", data: nextContact };
}

export async function simulateContactLink(contactId: string): Promise<ContactActionResponse> {
  await wait(500);
  const contact = getStoredEmergencyContact(contactId);

  if (!contact || contact.invitationStatus !== "invited") {
    return { success: false, message: "La invitación no está disponible para vincularse", data: null };
  }

  const nextContact: EmergencyContact = {
    ...contact,
    invitationStatus: "linked",
  };

  upsertStoredEmergencyContact(nextContact);

  return { success: true, message: "Simulación: contacto vinculado correctamente", data: nextContact };
}

export async function deleteEmergencyContact(contactId: string): Promise<ContactActionResponse> {
  await wait(500);
  const contact = getStoredEmergencyContact(contactId);

  if (!contact || contact.invitationStatus === "linked") {
    return { success: false, message: "No se puede eliminar este contacto", data: contact };
  }

  removeStoredEmergencyContact(contactId);

  return { success: true, message: "Contacto eliminado correctamente", data: null };
}
