import type {
  ActivationCode,
  DeviceServiceResponse,
  DevicesSetupState,
  LinkedDevice,
  MobileDevice,
  SmartwatchDevice,
} from "../types/device";
import { getStoredDevicesState, saveStoredDevicesState, updateStoredDevicesState } from "./deviceStorageService";

export interface DeviceDuplicateResponse {
  success: boolean;
  message: string;
}

const ACTIVATION_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ACTIVATION_DURATION_MS = 10 * 60 * 1000;
const RESERVED_DUPLICATE_FINGERPRINT = "MOBILE-DUPLICATE-001";

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function getCryptoIndex(maxExclusive: number): number {
  const values = new Uint32Array(1);
  window.crypto.getRandomValues(values);
  return values[0] % maxExclusive;
}

function generateCodeSegment(): string {
  let segment = "";

  for (let index = 0; index < 4; index += 1) {
    segment += ACTIVATION_ALPHABET[getCryptoIndex(ACTIVATION_ALPHABET.length)];
  }

  return segment;
}

function buildActivationCode(): ActivationCode {
  const code = [generateCodeSegment(), generateCodeSegment(), generateCodeSegment()].join("-");
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + ACTIVATION_DURATION_MS);

  return {
    code,
    activationLink: `https://motosos.local/activar/${code}`,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: "active",
  };
}

function isActiveActivationCode(activationCode: ActivationCode | null): activationCode is ActivationCode {
  return Boolean(
    activationCode && activationCode.status === "active" && new Date(activationCode.expiresAt).getTime() > Date.now(),
  );
}

function createMobileDevice(): MobileDevice {
  const now = new Date().toISOString();

  return {
    id: "mobile-demo-001",
    type: "mobile_app",
    name: "Samsung Galaxy S23",
    operatingSystem: "Android 14",
    status: "linked",
    batteryLevel: 78,
    connectionQuality: "strong",
    lastSynchronization: now,
    linkedAt: now,
  };
}

function createSmartwatchDevice(): SmartwatchDevice {
  const now = new Date().toISOString();

  return {
    id: "watch-demo-001",
    type: "smartwatch",
    name: "MotoSOS Watch",
    model: "Samsung Galaxy Watch 6",
    operatingSystem: "Wear OS",
    status: "linked",
    batteryLevel: 64,
    connectionQuality: "medium",
    lastSynchronization: now,
    linkedAt: now,
  };
}

function nextBatteryLevel(device: LinkedDevice): number | null {
  if (device.batteryLevel === null) {
    return null;
  }

  const reduction = device.type === "mobile_app" ? 1 : 2;
  const minimum = device.type === "mobile_app" ? 72 : 58;
  return Math.max(device.batteryLevel - reduction, minimum);
}

export async function generateMobileActivationCode(): Promise<DeviceServiceResponse<ActivationCode>> {
  await wait(600);
  const state = getStoredDevicesState();

  if (state.mobileDevice?.status === "linked") {
    return { success: false, message: "Ya existe una aplicación móvil vinculada", data: null };
  }

  const activationCode = buildActivationCode();
  updateStoredDevicesState({ activationCode });

  return {
    success: true,
    message: "Código de activación generado correctamente",
    data: activationCode,
  };
}

export async function regenerateMobileActivationCode(): Promise<DeviceServiceResponse<ActivationCode>> {
  await wait(600);
  const state = getStoredDevicesState();

  if (state.mobileDevice?.status === "linked") {
    return { success: false, message: "Ya existe una aplicación móvil vinculada", data: null };
  }

  const activationCode = buildActivationCode();
  updateStoredDevicesState({ activationCode });

  return {
    success: true,
    message: "Se generó un nuevo código de activación",
    data: activationCode,
  };
}

export async function simulateMobileAppLink(code: string): Promise<DeviceServiceResponse<DevicesSetupState>> {
  await wait(800);
  const state = getStoredDevicesState();

  if (state.mobileDevice?.status === "linked") {
    return { success: false, message: "Ya existe una aplicación móvil vinculada", data: state };
  }

  if (!isActiveActivationCode(state.activationCode) || state.activationCode.code !== code) {
    return { success: false, message: "El código de activación no está disponible", data: state };
  }

  const nextState = saveStoredDevicesState({
    activationCode: { ...state.activationCode, status: "used" },
    mobileDevice: createMobileDevice(),
    smartwatchDevice: state.smartwatchDevice,
  });

  return { success: true, message: "Aplicación móvil vinculada correctamente", data: nextState };
}

export async function getLinkedDevices(): Promise<DeviceServiceResponse<DevicesSetupState>> {
  await wait(300);
  return { success: true, message: "Dispositivos consultados correctamente", data: getStoredDevicesState() };
}

export async function simulateSmartwatchStatus(): Promise<DeviceServiceResponse<SmartwatchDevice>> {
  await wait(800);
  const state = getStoredDevicesState();

  if (state.mobileDevice?.status !== "linked") {
    return { success: false, message: "Vincula la app móvil antes de consultar el smartwatch", data: null };
  }

  const smartwatchDevice = createSmartwatchDevice();
  updateStoredDevicesState({ smartwatchDevice });

  return { success: true, message: "Estado de smartwatch reportado por la app móvil", data: smartwatchDevice };
}

export async function refreshDeviceStatus(deviceId: string): Promise<DeviceServiceResponse<LinkedDevice>> {
  await wait(600);
  const state = getStoredDevicesState();
  const device = state.mobileDevice?.id === deviceId ? state.mobileDevice : state.smartwatchDevice?.id === deviceId ? state.smartwatchDevice : null;

  if (!device || device.status === "revoked") {
    return { success: false, message: "No encontramos el dispositivo", data: null };
  }

  const updatedDevice: LinkedDevice = {
    ...device,
    batteryLevel: nextBatteryLevel(device),
    lastSynchronization: new Date().toISOString(),
  };

  if (updatedDevice.type === "mobile_app") {
    updateStoredDevicesState({ mobileDevice: updatedDevice });
  } else {
    updateStoredDevicesState({ smartwatchDevice: updatedDevice });
  }

  return { success: true, message: "Estado actualizado correctamente", data: updatedDevice };
}

export async function revokeDevice(deviceId: string): Promise<DeviceServiceResponse<DevicesSetupState>> {
  await wait(500);
  const state = getStoredDevicesState();

  if (state.mobileDevice?.id === deviceId) {
    const nextState = saveStoredDevicesState({
      activationCode: null,
      mobileDevice: { ...state.mobileDevice, status: "revoked", connectionQuality: "offline" },
      smartwatchDevice: state.smartwatchDevice
        ? { ...state.smartwatchDevice, status: "revoked", connectionQuality: "offline" }
        : null,
    });

    return { success: true, message: "Dispositivo revocado correctamente", data: nextState };
  }

  if (state.smartwatchDevice?.id === deviceId) {
    const nextState = saveStoredDevicesState({
      ...state,
      smartwatchDevice: { ...state.smartwatchDevice, status: "revoked", connectionQuality: "offline" },
    });

    return { success: true, message: "Dispositivo revocado correctamente", data: nextState };
  }

  return { success: false, message: "No encontramos el dispositivo", data: state };
}

export async function checkDeviceDuplicate(deviceFingerprint: string): Promise<DeviceDuplicateResponse> {
  await wait(350);

  if (deviceFingerprint === RESERVED_DUPLICATE_FINGERPRINT) {
    return {
      success: false,
      message: "Este dispositivo ya está vinculado a una cuenta MotoSOS",
    };
  }

  return { success: true, message: "Dispositivo disponible para vinculación" };
}
