import type { SetupStepKey } from "./sessionService";

export interface EmergencyContactDraft {
  fullName: string;
  relationship: string;
  phone: string;
}

export interface DriverProfileFormData {
  fullName: string;
  birthDate: string;
  personalId: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  medicalConditions: string;
  bloodType: string;
  emergencyContact: EmergencyContactDraft;
  licenseFile: File | null;
}

export interface SaveDriverProfileResponse {
  success: true;
  message: string;
  data: {
    profileId: string;
    completed: true;
    nextStep: SetupStepKey;
  };
}

export function saveDriverProfile(
  _data: DriverProfileFormData,
): Promise<SaveDriverProfileResponse> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve({
        success: true,
        message: "Perfil guardado correctamente",
        data: {
          profileId: "profile-demo-001",
          completed: true,
          nextStep: "motocicleta",
        },
      });
    }, 800);
  });
}
