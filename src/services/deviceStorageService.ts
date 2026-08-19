import type { ActivationCode, DevicesSetupState, DeviceStatus, MobileDevice, SmartwatchDevice } from "../types/device";

function devicesKeyFor(userId: string): string {
  return `motosos.devices.${userId}`;
}

function resolveUserId(userId?: string): string | null {
  const resolved = userId ?? window.sessionStorage.getItem("motosos.currentUserId");

  return resolved && resolved.length > 0 ? resolved : null;
}

function isDeviceStatus(value: unknown): value is DeviceStatus {
  return value === "not_linked" || value === "pending" || value === "linked" || value === "offline" || value === "revoked";
}

function isActivationCode(value: unknown): value is ActivationCode {
  if (!value || typeof value !== "object") {
    return false;
  }

  const activationCode = value as Partial<ActivationCode>;
  return (
    typeof activationCode.code === "string" &&
    typeof activationCode.activationLink === "string" &&
    typeof activationCode.createdAt === "string" &&
    typeof activationCode.expiresAt === "string" &&
    (activationCode.status === "active" ||
      activationCode.status === "expired" ||
      activationCode.status === "used" ||
      activationCode.status === "revoked")
  );
}

function isMobileDevice(value: unknown): value is MobileDevice {
  if (!value || typeof value !== "object") {
    return false;
  }

  const device = value as Partial<MobileDevice>;
  return (
    device.type === "mobile_app" &&
    typeof device.id === "string" &&
    typeof device.name === "string" &&
    typeof device.operatingSystem === "string" &&
    isDeviceStatus(device.status) &&
    (typeof device.batteryLevel === "number" || device.batteryLevel === null) &&
    (device.connectionQuality === "strong" ||
      device.connectionQuality === "medium" ||
      device.connectionQuality === "weak" ||
      device.connectionQuality === "offline") &&
    (typeof device.lastSynchronization === "string" || device.lastSynchronization === null) &&
    (typeof device.linkedAt === "string" || device.linkedAt === null)
  );
}

function isSmartwatchDevice(value: unknown): value is SmartwatchDevice {
  if (!value || typeof value !== "object") {
    return false;
  }

  const device = value as Partial<SmartwatchDevice>;
  return (
    device.type === "smartwatch" &&
    typeof device.id === "string" &&
    typeof device.name === "string" &&
    typeof device.model === "string" &&
    typeof device.operatingSystem === "string" &&
    isDeviceStatus(device.status) &&
    (typeof device.batteryLevel === "number" || device.batteryLevel === null) &&
    (device.connectionQuality === "strong" ||
      device.connectionQuality === "medium" ||
      device.connectionQuality === "weak" ||
      device.connectionQuality === "offline") &&
    (typeof device.lastSynchronization === "string" || device.lastSynchronization === null) &&
    (typeof device.linkedAt === "string" || device.linkedAt === null)
  );
}

function sanitizeActivationCode(activationCode: ActivationCode | null): ActivationCode | null {
  if (!activationCode || activationCode.status !== "active") {
    return null;
  }

  if (new Date(activationCode.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  return activationCode;
}

function sanitizeDevice<Device extends MobileDevice | SmartwatchDevice>(device: Device | null): Device | null {
  if (!device) {
    return null;
  }

  return device;
}

function parseState(value: string): DevicesSetupState {
  try {
    const parsed = JSON.parse(value) as Partial<DevicesSetupState>;

    return {
      activationCode: isActivationCode(parsed.activationCode) ? sanitizeActivationCode(parsed.activationCode) : null,
      mobileDevice: isMobileDevice(parsed.mobileDevice) ? sanitizeDevice(parsed.mobileDevice) : null,
      smartwatchDevice: isSmartwatchDevice(parsed.smartwatchDevice) ? sanitizeDevice(parsed.smartwatchDevice) : null,
    };
  } catch {
    return { activationCode: null, mobileDevice: null, smartwatchDevice: null };
  }
}

export function getStoredDevicesState(userId?: string): DevicesSetupState {
  const resolvedUserId = resolveUserId(userId);

  if (!resolvedUserId) {
    return { activationCode: null, mobileDevice: null, smartwatchDevice: null };
  }

  const storedState = window.sessionStorage.getItem(devicesKeyFor(resolvedUserId));

  if (!storedState) {
    return { activationCode: null, mobileDevice: null, smartwatchDevice: null };
  }

  const state = parseState(storedState);
  saveStoredDevicesState(resolvedUserId, state);
  return state;
}

export function saveStoredDevicesState(userId: string, state: DevicesSetupState): DevicesSetupState;
export function saveStoredDevicesState(state: DevicesSetupState): DevicesSetupState;
export function saveStoredDevicesState(userIdOrState: string | DevicesSetupState, state?: DevicesSetupState): DevicesSetupState {
  const userId = resolveUserId(typeof userIdOrState === "string" ? userIdOrState : undefined);
  const source = typeof userIdOrState === "string" ? state : userIdOrState;

  if (!userId || !source) {
    return { activationCode: null, mobileDevice: null, smartwatchDevice: null };
  }

  const nextState: DevicesSetupState = {
    activationCode: sanitizeActivationCode(source.activationCode),
    mobileDevice: sanitizeDevice(source.mobileDevice),
    smartwatchDevice: sanitizeDevice(source.smartwatchDevice),
  };

  window.sessionStorage.setItem(devicesKeyFor(userId), JSON.stringify(nextState));
  return nextState;
}

export function updateStoredDevicesState(userId: string, updates: Partial<DevicesSetupState>): DevicesSetupState;
export function updateStoredDevicesState(updates: Partial<DevicesSetupState>): DevicesSetupState;
export function updateStoredDevicesState(
  userIdOrUpdates: string | Partial<DevicesSetupState>,
  updates?: Partial<DevicesSetupState>,
): DevicesSetupState {
  const userId = resolveUserId(typeof userIdOrUpdates === "string" ? userIdOrUpdates : undefined);
  const source = typeof userIdOrUpdates === "string" ? updates : userIdOrUpdates;

  if (!userId || !source) {
    return { activationCode: null, mobileDevice: null, smartwatchDevice: null };
  }

  const currentState = getStoredDevicesState(userId);
  return saveStoredDevicesState(userId, { ...currentState, ...source });
}

export function clearStoredDevicesState(userId?: string) {
  const resolvedUserId = resolveUserId(userId);

  if (resolvedUserId) {
    window.sessionStorage.removeItem(devicesKeyFor(resolvedUserId));
  }
}
