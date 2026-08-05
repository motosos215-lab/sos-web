import type { DriverProfileFormData, EmergencyContactDraft } from "./profileService";

function profileDraftKeyFor(userId: string): string {
  return `motosos.profileDraft.${userId}`;
}

function resolveUserId(userId?: string): string | null {
  const resolved = userId ?? window.sessionStorage.getItem("motosos.currentUserId");

  return resolved && resolved.length > 0 ? resolved : null;
}

interface DriverProfileDraft {
  fullName: string;
  birthDate: string;
  personalId: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  bloodType: string;
  emergencyContact: EmergencyContactDraft;
}

function isEmergencyContactDraft(value: unknown): value is EmergencyContactDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const contact = value as Partial<EmergencyContactDraft>;
  return (
    typeof contact.fullName === "string" &&
    typeof contact.relationship === "string" &&
    typeof contact.phone === "string"
  );
}

function parseDraft(value: string): DriverProfileDraft | null {
  try {
    const parsed = JSON.parse(value) as Partial<DriverProfileDraft>;

    if (
      typeof parsed.fullName !== "string" ||
      typeof parsed.birthDate !== "string" ||
      typeof parsed.personalId !== "string" ||
      typeof parsed.phone !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.city !== "string" ||
      typeof parsed.address !== "string" ||
      typeof parsed.bloodType !== "string" ||
      !isEmergencyContactDraft(parsed.emergencyContact)
    ) {
      return null;
    }

    return {
      fullName: parsed.fullName,
      birthDate: parsed.birthDate,
      personalId: parsed.personalId,
      phone: parsed.phone,
      email: parsed.email,
      city: parsed.city,
      address: parsed.address,
      bloodType: parsed.bloodType,
      emergencyContact: parsed.emergencyContact,
    };
  } catch {
    return null;
  }
}

export function saveDriverProfileDraft(userId: string, data: DriverProfileFormData): void;
export function saveDriverProfileDraft(data: DriverProfileFormData): void;
export function saveDriverProfileDraft(userIdOrData: string | DriverProfileFormData, data?: DriverProfileFormData) {
  const userId = resolveUserId(typeof userIdOrData === "string" ? userIdOrData : undefined);
  const source = typeof userIdOrData === "string" ? data : userIdOrData;

  if (!userId || !source) {
    return;
  }

  const draft: DriverProfileDraft = {
    fullName: source.fullName,
    birthDate: source.birthDate,
    personalId: source.personalId,
    phone: source.phone,
    email: source.email,
    city: source.city,
    address: source.address,
    bloodType: source.bloodType,
    emergencyContact: source.emergencyContact,
  };

  window.sessionStorage.setItem(profileDraftKeyFor(userId), JSON.stringify(draft));
}

export function getDriverProfileDraft(userId?: string): DriverProfileDraft | null {
  const resolvedUserId = resolveUserId(userId);

  if (!resolvedUserId) {
    return null;
  }

  const storedDraft = window.sessionStorage.getItem(profileDraftKeyFor(resolvedUserId));

  if (!storedDraft) {
    return null;
  }

  return parseDraft(storedDraft);
}

export function clearDriverProfileDraft(userId?: string) {
  const resolvedUserId = resolveUserId(userId);

  if (resolvedUserId) {
    window.sessionStorage.removeItem(profileDraftKeyFor(resolvedUserId));
  }
}
