export type PlanId = "basico" | "plus" | "familiar_pro";

export type PlanStatus = "active" | "available" | "pending" | "expired" | "cancelled";

export type LicenseType = "individual" | "family" | "business";

export interface PlanFeature {
  id: string;
  label: string;
  included: boolean;
  limit?: number | null;
}

export interface MotoSosPlan {
  id: PlanId;
  name: string;
  description: string;
  status: PlanStatus;
  licenseType: LicenseType;
  features: PlanFeature[];
  upgradeAvailableInApp: boolean;
  contactLimit: number | null;
  vehicleLimit: number | null;
  driverLimit: number | null;
}

export interface UserPlanState {
  currentPlan: PlanId;
  status: PlanStatus;
  activatedAt: string;
  expiresAt: string | null;
  contactLimit: number | null;
  vehicleLimit: number | null;
  driverLimit: number | null;
  licenseType: LicenseType;
}

export interface PlanConfirmationState {
  planId: PlanId;
  status: PlanStatus;
  completed: boolean;
  nextStep: "confirmacion";
}

export interface BusinessLicenseRequestState {
  requested: boolean;
  message: string;
}

export interface PlanServiceResponse<Data> {
  success: boolean;
  message: string;
  data: Data | null;
}
