import type { SetupStepKey } from "../services/sessionService";
export type { ApiResponse } from "./auth";

export interface OnboardingStatus {
  isCompleted?: boolean;
  isConfirmed?: boolean;
  currentStep?: SetupStepKey;
  profileCompleted?: boolean;
  vehicleCompleted?: boolean;
  emergencyContactsCompleted?: boolean;
  devicesCompleted?: boolean;
  planCompleted?: boolean;
}

export interface OnboardingSummaryModule {
  key?: string;
  title?: string;
  status?: string;
  blockingMessage?: string;
  warningMessage?: string;
}

export interface OnboardingSummaryStep {
  key?: string;
  order?: number;
  label?: string;
  status?: string;
}

export interface OnboardingSummaryUser {
  id?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
}

export interface OnboardingSummaryProfile {
  fullName?: string;
  phoneNumber?: string;
  primaryCity?: string;
  addressOrZone?: string;
}

export interface OnboardingSummaryVehicle {
  id?: string;
  vehicleType?: string;
  brand?: string;
  model?: string;
  year?: number;
  alias?: string;
}

export interface OnboardingSummaryEmergencyContact {
  id?: string;
  fullName?: string;
  phoneNumber?: string;
  relationship?: string;
  invitationStatus?: string;
}

export interface OnboardingSummaryDevice {
  id?: string;
  deviceType?: string;
  deviceName?: string;
  platform?: string;
  linkStatus?: string;
  connectionStatus?: string;
  batteryLevel?: number;
}

export interface OnboardingSummarySubscription {
  id?: string;
  planTier?: string;
  status?: string;
  source?: string;
}

export interface OnboardingSummary {
  isCompleted?: boolean;
  isValid?: boolean;
  canConfirm?: boolean;
  isConfirmed?: boolean;
  isOperational?: boolean;
  completedSteps?: number;
  progressPercentage?: number;
  currentStep?: SetupStepKey;
  modules?: OnboardingSummaryModule[];
  blockingIssues?: string[];
  warnings?: string[];
  user?: OnboardingSummaryUser;
  profile?: OnboardingSummaryProfile;
  vehicle?: OnboardingSummaryVehicle;
  emergencyContact?: OnboardingSummaryEmergencyContact;
  mobileDevice?: OnboardingSummaryDevice;
  smartwatch?: OnboardingSummaryDevice;
  subscription?: OnboardingSummarySubscription;
  steps?: OnboardingSummaryStep[];
}

export interface ConfirmOnboardingResult {
  isCompleted?: boolean;
  completedAtUtc?: string;
}
