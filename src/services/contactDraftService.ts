import type { EmergencyContactDraft } from "../types/contact";

function contactDraftKeyFor(userId: string): string {
  return `motosos.contactDraft.${userId}`;
}

function resolveUserId(userId?: string): string | null {
  const resolved = userId ?? window.sessionStorage.getItem("motosos.currentUserId");

  return resolved && resolved.length > 0 ? resolved : null;
}

function isContactDraft(value: unknown): value is EmergencyContactDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const draft = value as Partial<EmergencyContactDraft>;
  const permissions = draft.permissions;

  return (
    typeof draft.fullName === "string" &&
    typeof draft.relationship === "string" &&
    typeof draft.customRelationship === "string" &&
    typeof draft.phone === "string" &&
    typeof draft.email === "string" &&
    typeof draft.priority === "string" &&
    typeof draft.invitationChannel === "string" &&
    Boolean(permissions) &&
    typeof permissions?.realTimeLocation === "boolean" &&
    typeof permissions.criticalAlerts === "boolean" &&
    typeof permissions.minorIncidents === "boolean" &&
    typeof permissions.vitalSigns === "boolean"
  );
}

function parseDraft(value: string): EmergencyContactDraft | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return isContactDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveEmergencyContactDraft(userId: string, draft: EmergencyContactDraft): void;
export function saveEmergencyContactDraft(draft: EmergencyContactDraft): void;
export function saveEmergencyContactDraft(userIdOrDraft: string | EmergencyContactDraft, draft?: EmergencyContactDraft) {
  const userId = resolveUserId(typeof userIdOrDraft === "string" ? userIdOrDraft : undefined);
  const source = typeof userIdOrDraft === "string" ? draft : userIdOrDraft;

  if (userId && source) {
    window.sessionStorage.setItem(contactDraftKeyFor(userId), JSON.stringify(source));
  }
}

export function getEmergencyContactDraft(userId?: string): EmergencyContactDraft | null {
  const resolvedUserId = resolveUserId(userId);

  if (!resolvedUserId) {
    return null;
  }

  const storedDraft = window.sessionStorage.getItem(contactDraftKeyFor(resolvedUserId));

  if (!storedDraft) {
    return null;
  }

  return parseDraft(storedDraft);
}

export function clearEmergencyContactDraft(userId?: string) {
  const resolvedUserId = resolveUserId(userId);

  if (resolvedUserId) {
    window.sessionStorage.removeItem(contactDraftKeyFor(resolvedUserId));
  }
}
