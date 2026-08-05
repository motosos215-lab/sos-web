export type DeviceType = "mobile_app" | "smartwatch";

export type DeviceStatus = "not_linked" | "pending" | "linked" | "offline" | "revoked";

export type ConnectionQuality = "strong" | "medium" | "weak" | "offline";

export type ActivationCodeStatus = "active" | "expired" | "used" | "revoked";

export interface ActivationCode {
  code: string;
  activationLink: string;
  createdAt: string;
  expiresAt: string;
  status: ActivationCodeStatus;
}

export interface MobileDevice {
  id: string;
  type: "mobile_app";
  name: string;
  operatingSystem: string;
  status: DeviceStatus;
  batteryLevel: number | null;
  connectionQuality: ConnectionQuality;
  lastSynchronization: string | null;
  linkedAt: string | null;
}

export interface SmartwatchDevice {
  id: string;
  type: "smartwatch";
  name: string;
  model: string;
  operatingSystem: string;
  status: DeviceStatus;
  batteryLevel: number | null;
  connectionQuality: ConnectionQuality;
  lastSynchronization: string | null;
  linkedAt: string | null;
}

export type LinkedDevice = MobileDevice | SmartwatchDevice;

export interface DevicesSetupState {
  activationCode: ActivationCode | null;
  mobileDevice: MobileDevice | null;
  smartwatchDevice: SmartwatchDevice | null;
}

export interface DeviceServiceResponse<Data> {
  success: boolean;
  message: string;
  data: Data | null;
}
