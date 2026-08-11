import { AxiosError } from "axios";
import type { ApiResponse } from "../types/auth";
import { api, unwrap } from "./api";

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

export type ProfileSaveMode = "Complete";

export interface MyProfile {
  fullName?: string;
  phoneNumber?: string | null;
  dateOfBirth?: string | null;
  curpOrIdentifier?: string | null;
  addressOrZone?: string | null;
  primaryCity?: string | null;
  bloodType?: string | null;
  allergies?: string | null;
  medicalConditions?: string | null;
  provisionalEmergencyContactName?: string | null;
  provisionalEmergencyContactPhone?: string | null;
}

export interface SaveMyProfilePayload {
  fullName: string;
  phoneNumber: string;
  dateOfBirth: string;
  curpOrIdentifier: string;
  addressOrZone: string;
  primaryCity: string;
  bloodType: string;
  allergies: string;
  medicalConditions: string;
  provisionalEmergencyContactName: string;
  provisionalEmergencyContactPhone: string;
  saveMode: ProfileSaveMode;
}

export function mapDriverProfileFormToPayload(data: DriverProfileFormData): SaveMyProfilePayload {
  return {
    fullName: data.fullName.trim(),
    phoneNumber: data.phone.trim(),
    dateOfBirth: data.birthDate,
    curpOrIdentifier: data.personalId.trim(),
    addressOrZone: data.address.trim(),
    primaryCity: data.city,
    bloodType: data.bloodType,
    allergies: "",
    medicalConditions: data.medicalConditions.trim(),
    provisionalEmergencyContactName: data.emergencyContact.fullName.trim(),
    provisionalEmergencyContactPhone: data.emergencyContact.phone.trim(),
    saveMode: "Complete",
  };
}

export async function getMyProfile(): Promise<MyProfile | null> {
  try {
    const response = await api.get<ApiResponse<unknown>>("/api/v1/profiles/me");
    const data = unwrap<unknown>(response);

    return data && typeof data === "object" ? (data as MyProfile) : null;
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function saveMyProfile(payload: SaveMyProfilePayload): Promise<MyProfile | null> {
  const response = await api.put<ApiResponse<unknown>>("/api/v1/profiles/me", payload);
  const data = unwrap<unknown>(response);

  return data && typeof data === "object" ? (data as MyProfile) : null;
}
