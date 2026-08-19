import type { EmergencyContactDraft } from "../types/contact";

const draftsByUserId = new Map<string, EmergencyContactDraft>();

function contactDraftKeyFor(userId: string): string {
  return `motosos.contactDraft.${userId}`;
}

function resolveUserId(userId?: string): string | null {
  const resolved = userId ?? window.sessionStorage.getItem("motosos.currentUserId");

  return resolved && resolved.length > 0 ? resolved : null;
}

export function saveEmergencyContactDraft(userId: string, draft: EmergencyContactDraft): void;
export function saveEmergencyContactDraft(draft: EmergencyContactDraft): void;
export function saveEmergencyContactDraft(userIdOrDraft: string | EmergencyContactDraft, draft?: EmergencyContactDraft) {
  const userId = resolveUserId(typeof userIdOrDraft === "string" ? userIdOrDraft : undefined);
  const source = typeof userIdOrDraft === "string" ? draft : userIdOrDraft;

  if (userId && source) {
    draftsByUserId.set(userId, source);
    window.sessionStorage.removeItem(contactDraftKeyFor(userId));
  }
}

export function getEmergencyContactDraft(userId?: string): EmergencyContactDraft | null {
  const resolvedUserId = resolveUserId(userId);

  if (!resolvedUserId) {
    return null;
  }

  window.sessionStorage.removeItem(contactDraftKeyFor(resolvedUserId));
  return draftsByUserId.get(resolvedUserId) ?? null;
}

export function clearEmergencyContactDraft(userId?: string) {
  const resolvedUserId = resolveUserId(userId);

  if (resolvedUserId) {
    draftsByUserId.delete(resolvedUserId);
    window.sessionStorage.removeItem(contactDraftKeyFor(resolvedUserId));
  }
}
