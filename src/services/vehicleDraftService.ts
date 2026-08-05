import type { VehicleDraft, VehicleFormData } from "../types/vehicle";

function vehicleDraftKeyFor(userId: string): string {
  return `motosos.vehicleDraft.${userId}`;
}

function resolveUserId(userId?: string): string | null {
  const resolved = userId ?? window.sessionStorage.getItem("motosos.currentUserId");

  return resolved && resolved.length > 0 ? resolved : null;
}

function isDraft(value: unknown): value is VehicleDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const draft = value as Partial<VehicleDraft>;

  return (
    typeof draft.vehicleType === "string" &&
    typeof draft.brand === "string" &&
    typeof draft.customBrand === "string" &&
    typeof draft.model === "string" &&
    (typeof draft.year === "number" || draft.year === "") &&
    typeof draft.color === "string" &&
    typeof draft.licensePlate === "string" &&
    typeof draft.vinOrSerialNumber === "string" &&
    typeof draft.alias === "string" &&
    typeof draft.mainUse === "string" &&
    typeof draft.useFrequency === "string" &&
    typeof draft.circulationCity === "string" &&
    typeof draft.customCirculationCity === "string"
  );
}

function parseDraft(value: string): VehicleDraft | null {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (!isDraft(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function saveVehicleDraft(userId: string, data: VehicleFormData): void;
export function saveVehicleDraft(data: VehicleFormData): void;
export function saveVehicleDraft(userIdOrData: string | VehicleFormData, data?: VehicleFormData) {
  const userId = resolveUserId(typeof userIdOrData === "string" ? userIdOrData : undefined);
  const source = typeof userIdOrData === "string" ? data : userIdOrData;

  if (!userId || !source) {
    return;
  }

  const draft: VehicleDraft = {
    vehicleType: source.vehicleType,
    brand: source.brand,
    customBrand: source.customBrand,
    model: source.model,
    year: source.year,
    color: source.color,
    licensePlate: source.licensePlate,
    vinOrSerialNumber: source.vinOrSerialNumber,
    alias: source.alias,
    mainUse: source.mainUse,
    useFrequency: source.useFrequency,
    circulationCity: source.circulationCity,
    customCirculationCity: source.customCirculationCity,
  };

  window.sessionStorage.setItem(vehicleDraftKeyFor(userId), JSON.stringify(draft));
}

export function getVehicleDraft(userId?: string): VehicleDraft | null {
  const resolvedUserId = resolveUserId(userId);

  if (!resolvedUserId) {
    return null;
  }

  const storedDraft = window.sessionStorage.getItem(vehicleDraftKeyFor(resolvedUserId));

  if (!storedDraft) {
    return null;
  }

  return parseDraft(storedDraft);
}

export function clearVehicleDraft(userId?: string) {
  const resolvedUserId = resolveUserId(userId);

  if (resolvedUserId) {
    window.sessionStorage.removeItem(vehicleDraftKeyFor(resolvedUserId));
  }
}
