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

export interface OnboardingSummary {
  isCompleted?: boolean;
  isValid?: boolean;
  currentStep?: SetupStepKey;
  modules?: OnboardingSummaryModule[];
  blockingIssues?: string[];
  warnings?: string[];
}

export interface ConfirmOnboardingResult {
  isCompleted?: boolean;
  completedAtUtc?: string;
}
