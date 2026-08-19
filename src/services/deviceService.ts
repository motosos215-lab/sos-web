import type {
  ActivationCode,
  DeviceServiceResponse,
  DevicesSetupState,
  LinkedDevice,
  MobileDevice,
  SmartwatchDevice,
} from "../types/device";
import type { ApiResponse } from "../types/auth";
import { api, unwrap } from "./api";
import { getStoredDevicesState, saveStoredDevicesState, updateStoredDevicesState } from "./deviceStorageService";
import { getApiErrorMessage } from "../utils/apiErrors";

function isActiveActivationCode(activationCode: ActivationCode | null): activationCode is ActivationCode {
  return Boolean(activationCode && activationCode.status === "active" && new Date(activationCode.expiresAt).getTime() > Date.now());
}

interface ActivationCodeApiRecord {
  code?: string;
  expiresAtUtc?: string;
  createdAtUtc?: string;
}

interface DeviceApiRecord {
  id?: string;
  deviceType?: string;
  type?: string;
  deviceName?: string;
  name?: string;
  platform?: string;
  manufacturer?: string;
  model?: string;
  operatingSystemVersion?: string;
  status?: string;
  connectionStatus?: string;
  batteryLevel?: number | null;
  lastHeartbeatAtUtc?: string | null;
  lastSynchronization?: string | null;
  linkedAtUtc?: string | null;
  createdAtUtc?: string | null;
}

function readActivationCode(value: unknown): ActivationCode | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as { activationCode?: ActivationCodeApiRecord | null } & ActivationCodeApiRecord;
  const record = source.activationCode ?? source;

  if (!record?.code || !record.expiresAtUtc) {
    return null;
  }

  return {
    code: record.code,
    activationLink: `${window.location.origin}/activar/${record.code}`,
    createdAt: record.createdAtUtc ?? new Date().toISOString(),
    expiresAt: record.expiresAtUtc,
    status: new Date(record.expiresAtUtc).getTime() > Date.now() ? "active" : "expired",
  };
}

function normalizeStatus(status: string | undefined): LinkedDevice["status"] {
  switch (status?.toLowerCase()) {
    case "linked":
    case "active":
    case "online":
      return "linked";
    case "offline":
      return "offline";
    case "revoked":
      return "revoked";
    case "pending":
      return "pending";
    default:
      return "not_linked";
  }
}

function normalizeConnection(status: string | undefined): LinkedDevice["connectionQuality"] {
  switch (status?.toLowerCase()) {
    case "online":
    case "linked":
    case "active":
    case "strong":
      return "strong";
    case "medium":
      return "medium";
    case "weak":
      return "weak";
    default:
      return "offline";
  }
}

function toLinkedDevice(record: DeviceApiRecord): LinkedDevice | null {
  if (!record.id) {
    return null;
  }

  const rawType = (record.deviceType ?? record.type ?? "").toLowerCase();
  const isSmartwatch = rawType.includes("watch");
  const name = record.deviceName ?? record.name ?? (isSmartwatch ? "Smartwatch" : "App móvil");
  const operatingSystem = [record.platform, record.operatingSystemVersion].filter(Boolean).join(" ") || record.platform || "Android";
  const status = normalizeStatus(record.status ?? record.connectionStatus);
  const connectionQuality = normalizeConnection(record.connectionStatus ?? record.status);
  const lastSynchronization = record.lastHeartbeatAtUtc ?? record.lastSynchronization ?? null;
  const linkedAt = record.linkedAtUtc ?? record.createdAtUtc ?? null;

  if (isSmartwatch) {
    return {
      id: record.id,
      type: "smartwatch",
      name,
      model: record.model ?? record.manufacturer ?? "Wear OS",
      operatingSystem,
      status,
      batteryLevel: typeof record.batteryLevel === "number" ? record.batteryLevel : null,
      connectionQuality,
      lastSynchronization,
      linkedAt,
    };
  }

  return {
    id: record.id,
    type: "mobile_app",
    name,
    operatingSystem,
    status,
    batteryLevel: typeof record.batteryLevel === "number" ? record.batteryLevel : null,
    connectionQuality,
    lastSynchronization,
    linkedAt,
  };
}

function readDevices(value: unknown): LinkedDevice[] {
  const records =
    value && typeof value === "object" && Array.isArray((value as { devices?: unknown[] }).devices)
      ? (value as { devices: DeviceApiRecord[] }).devices
      : Array.isArray(value)
        ? (value as DeviceApiRecord[])
        : [];

  return records.map(toLinkedDevice).filter((device): device is LinkedDevice => Boolean(device));
}

function toDevicesState(devices: LinkedDevice[], activationCode = getStoredDevicesState().activationCode): DevicesSetupState {
  return saveStoredDevicesState({
    activationCode,
    mobileDevice: devices.find((device): device is MobileDevice => device.type === "mobile_app") ?? null,
    smartwatchDevice: devices.find((device): device is SmartwatchDevice => device.type === "smartwatch") ?? null,
  });
}

export async function generateMobileActivationCode(): Promise<DeviceServiceResponse<ActivationCode>> {
  const state = getStoredDevicesState();

  if (state.mobileDevice?.status === "linked") {
    return { success: false, message: "Ya existe una aplicación móvil vinculada", data: null };
  }

  try {
    const response = await api.post<ApiResponse<unknown>>("/api/v1/devices/mobile/activation-code");
    const activationCode = readActivationCode(unwrap<unknown>(response));

    if (!activationCode) {
      return { success: false, message: "No pudimos leer el código de activación", data: null };
    }

    updateStoredDevicesState({ activationCode });

    return {
      success: true,
      message: "Código de activación generado correctamente",
      data: activationCode,
    };
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error), data: null };
  }
}

export async function regenerateMobileActivationCode(): Promise<DeviceServiceResponse<ActivationCode>> {
  const response = await generateMobileActivationCode();
  return response.success ? { ...response, message: "Se generó un nuevo código de activación" } : response;
}

export async function linkMobileApp(code: string): Promise<DeviceServiceResponse<DevicesSetupState>> {
  const state = getStoredDevicesState();

  if (state.mobileDevice?.status === "linked") {
    return { success: false, message: "Ya existe una aplicación móvil vinculada", data: state };
  }

  if (!isActiveActivationCode(state.activationCode) || state.activationCode.code !== code) {
    return { success: false, message: "El código de activación no está disponible", data: state };
  }

  try {
    const response = await api.post<ApiResponse<unknown>>("/api/v1/devices/mobile/link", {
      code,
      deviceName: "MotoSOS Web Android",
      platform: "Android",
      manufacturer: "MotoSOS",
      model: "Web Link",
      operatingSystemVersion: "14",
      appVersion: "1.0.0",
      deviceIdentifier: `web-${crypto.randomUUID()}`,
    });
    const data = unwrap<unknown>(response);
    const device = toLinkedDevice(
      (data && typeof data === "object" && "device" in data ? (data as { device: DeviceApiRecord }).device : data) as DeviceApiRecord,
    );

    if (!device || device.type !== "mobile_app") {
      return { success: false, message: "No pudimos confirmar la vinculación móvil", data: state };
    }

    const nextState = saveStoredDevicesState({
      activationCode: { ...state.activationCode, status: "used" },
      mobileDevice: device,
      smartwatchDevice: state.smartwatchDevice,
    });

    return { success: true, message: "Aplicación móvil vinculada correctamente", data: nextState };
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error), data: state };
  }
}

export async function getLinkedDevices(): Promise<DeviceServiceResponse<DevicesSetupState>> {
  try {
    const [devicesResponse, codeResponse] = await Promise.allSettled([
      api.get<ApiResponse<unknown>>("/api/v1/devices"),
      api.get<ApiResponse<unknown>>("/api/v1/devices/activation-codes/current"),
    ]);

    if (devicesResponse.status === "rejected") {
      throw devicesResponse.reason;
    }

    let activationCode: ActivationCode | null = null;

    if (codeResponse.status === "fulfilled") {
      try {
        activationCode = readActivationCode(unwrap<unknown>(codeResponse.value));
      } catch {
        activationCode = null;
      }
    }

    const state = toDevicesState(readDevices(unwrap<unknown>(devicesResponse.value)), activationCode);

    return { success: true, message: "Dispositivos consultados correctamente", data: state };
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error), data: getStoredDevicesState() };
  }
}

export async function checkSmartwatchStatus(): Promise<DeviceServiceResponse<SmartwatchDevice>> {
  const state = getStoredDevicesState();

  if (state.mobileDevice?.status !== "linked") {
    return { success: false, message: "Vincula la app móvil antes de consultar el smartwatch", data: null };
  }

  return { success: false, message: "El smartwatch se vincula desde la app móvil Android", data: null };
}

export async function refreshDeviceStatus(deviceId: string): Promise<DeviceServiceResponse<LinkedDevice>> {
  const response = await getLinkedDevices();
  const device =
    response.data?.mobileDevice?.id === deviceId
      ? response.data.mobileDevice
      : response.data?.smartwatchDevice?.id === deviceId
        ? response.data.smartwatchDevice
        : null;

  return device
    ? { success: true, message: "Estado actualizado correctamente", data: device }
    : { success: false, message: response.message || "No encontramos el dispositivo", data: null };
}

export async function revokeDevice(deviceId: string): Promise<DeviceServiceResponse<DevicesSetupState>> {
  const state = getStoredDevicesState();
  try {
    const response = await api.post<ApiResponse<unknown>>(`/api/v1/devices/${deviceId}/revoke`);
    unwrap<unknown>(response);
    const nextState = await getLinkedDevices();
    return { success: true, message: "Dispositivo revocado correctamente", data: nextState.data ?? state };
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error), data: state };
  }
}
