import type { EmergencyContact, EmergencyContactFormData, InvitationStatus } from "../types/contact";
import type { ApiResponse } from "../types/auth";
import { api, unwrap } from "./api";
import {
  getStoredEmergencyContact,
  removeStoredEmergencyContact,
  saveStoredEmergencyContacts,
  upsertStoredEmergencyContact,
} from "./contactStorageService";
import { getApiErrorMessage } from "../utils/apiErrors";

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

function normalizePhoneDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

function normalizeNationalPhone(phone: string) {
  return normalizePhoneDigits(phone).slice(0, 10);
}

interface ContactApiRecord {
  id?: string;
  fullName?: string;
  relationship?: string;
  phoneNumber?: string;
  email?: string;
  priority?: number;
  invitationStatus?: string;
  linkingCode?: string | null;
  linkingCodeExpiresAtUtc?: string | null;
  createdAtUtc?: string;
  permissions?: {
    canViewRealTimeLocation?: boolean;
    canReceiveCriticalAlerts?: boolean;
    canViewIncidentHistory?: boolean;
    canViewVitalSigns?: boolean;
  };
}

function readContactPayload(value: unknown): ContactApiRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as { contact?: ContactApiRecord } & ContactApiRecord;
  return source.contact ?? source;
}

function normalizeInvitationStatus(value: string | undefined): InvitationStatus {
  switch (value?.toLowerCase()) {
    case "invited":
      return "invited";
    case "linked":
      return "linked";
    case "rejected":
      return "rejected";
    case "expired":
      return "expired";
    case "revoked":
      return "revoked";
    case "draft":
    case "pending":
    default:
      return "pending";
  }
}

function toEmergencyContact(record: ContactApiRecord, fallback?: EmergencyContactFormData): EmergencyContact | null {
  if (!record.id) {
    return null;
  }

  return {
    fullName: record.fullName ?? fallback?.fullName ?? "Contacto",
    relationship: record.relationship ?? fallback?.relationship ?? "Contacto",
    phone: record.phoneNumber ?? fallback?.phone ?? "",
    email: record.email ?? fallback?.email ?? "",
    priority: record.priority === 1 ? "principal" : "secundario",
    invitationChannel: fallback?.invitationChannel ?? "codigo_enlace",
    permissions: {
      realTimeLocation: record.permissions?.canViewRealTimeLocation ?? fallback?.permissions.realTimeLocation ?? true,
      criticalAlerts: record.permissions?.canReceiveCriticalAlerts ?? fallback?.permissions.criticalAlerts ?? true,
      minorIncidents: record.permissions?.canViewIncidentHistory ?? fallback?.permissions.minorIncidents ?? false,
      vitalSigns: record.permissions?.canViewVitalSigns ?? fallback?.permissions.vitalSigns ?? false,
    },
    id: record.id,
    invitationStatus: normalizeInvitationStatus(record.invitationStatus),
    invitationCode: record.linkingCode ?? null,
    invitationLink: record.linkingCode ? `${window.location.origin}/invitacion/${record.linkingCode}` : null,
    invitationExpiresAt: record.linkingCodeExpiresAtUtc ?? null,
    createdAt: record.createdAtUtc ?? new Date().toISOString(),
  };
}

function toApiPayload(data: EmergencyContactFormData) {
  return {
    fullName: data.fullName.trim(),
    relationship: data.relationship.trim(),
    phoneNumber: normalizeNationalPhone(data.phone),
    email: data.email.trim().toLowerCase(),
    priority: data.priority === "secundario" ? 2 : 1,
    permissions: {
      canViewRealTimeLocation: data.permissions.realTimeLocation,
      canReceiveCriticalAlerts: data.permissions.criticalAlerts,
      canViewIncidentHistory: data.permissions.minorIncidents,
      canViewVitalSigns: data.permissions.vitalSigns,
    },
    saveMode: "Continue",
  };
}

export async function checkContactAvailability(_data: ContactAvailabilityRequest): Promise<ContactAvailabilityResponse> {
  return {
    success: true,
    duplicateField: null,
    message: "Contacto disponible",
  };
}

export async function saveEmergencyContact(data: EmergencyContactFormData): Promise<SaveEmergencyContactResponse> {
  try {
    const response = await api.post<ApiResponse<unknown>>("/api/v1/emergency-contacts", toApiPayload(data));
    const payload = readContactPayload(unwrap<unknown>(response));
    const contact = payload ? toEmergencyContact(payload, data) : null;

    if (!contact) {
      return { success: false, message: "No pudimos confirmar el contacto registrado", data: null };
    }

    upsertStoredEmergencyContact(contact);

    return {
      success: true,
      message: "Contacto guardado correctamente",
      data: {
        contactId: contact.id,
        invitationStatus: contact.invitationStatus,
      },
    };
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error), data: null };
  }
}

export async function updateEmergencyContact(id: string, data: EmergencyContactFormData): Promise<ContactActionResponse> {
  try {
    const response = await api.put<ApiResponse<unknown>>(`/api/v1/emergency-contacts/${id}`, toApiPayload(data));
    const payload = readContactPayload(unwrap<unknown>(response));
    const contact = payload ? toEmergencyContact(payload, data) : null;

    if (!contact) {
      return { success: false, message: "No pudimos confirmar la actualización del contacto", data: null };
    }

    upsertStoredEmergencyContact(contact);

    return {
      success: true,
      message: "Contacto actualizado correctamente",
      data: contact,
    };
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error), data: null };
  }
}

export async function sendContactInvitation(contact: EmergencyContact): Promise<InvitationResponse> {
  try {
    const response = await api.post<ApiResponse<unknown>>(`/api/v1/emergency-contacts/${contact.id}/invite`);
    const payload = readContactPayload(unwrap<unknown>(response));
    const nextContact = payload ? toEmergencyContact(payload, contact) : null;

    if (!nextContact?.invitationCode || !nextContact.invitationExpiresAt) {
      return { success: false, message: "No pudimos generar la invitación", data: null };
    }

    upsertStoredEmergencyContact(nextContact);

    return {
      success: true,
      message: "Invitación generada correctamente",
      data: {
        invitationCode: nextContact.invitationCode,
        invitationLink: nextContact.invitationLink ?? `${window.location.origin}/invitacion/${nextContact.invitationCode}`,
        invitationStatus: "invited",
        expiresAt: nextContact.invitationExpiresAt,
      },
    };
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error), data: null };
  }
}

export async function resendContactInvitation(contactId: string): Promise<InvitationResponse> {
  const contact = getStoredEmergencyContact(contactId);

  if (!contact) {
    return { success: false, message: "No encontramos el contacto", data: null };
  }

  return sendContactInvitation(contact);
}

export async function revokeContactInvitation(contactId: string): Promise<ContactActionResponse> {
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

export async function deleteEmergencyContact(contactId: string): Promise<ContactActionResponse> {
  try {
    const response = await api.delete<ApiResponse<unknown> | null>(`/api/v1/emergency-contacts/${contactId}`);
    unwrap<unknown>(response);
    removeStoredEmergencyContact(contactId);

    return { success: true, message: "Contacto eliminado correctamente", data: null };
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error), data: getStoredEmergencyContact(contactId) };
  }
}

export async function syncEmergencyContacts(): Promise<ContactActionResponse[]> {
  const response = await api.get<ApiResponse<unknown>>("/api/v1/emergency-contacts");
  const data = unwrap<unknown>(response);
  const records =
    data && typeof data === "object" && Array.isArray((data as { contacts?: unknown[] }).contacts)
      ? (data as { contacts: unknown[] }).contacts
      : Array.isArray(data)
        ? data
        : [];
  const contacts = records
    .map((item) => toEmergencyContact(readContactPayload(item) ?? {}))
    .filter((item): item is EmergencyContact => Boolean(item));

  saveStoredEmergencyContacts(contacts);
  return contacts.map((contact) => ({ success: true, message: "Contacto sincronizado", data: contact }));
}
