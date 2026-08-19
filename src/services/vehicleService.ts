import type { VehicleFormData } from "../types/vehicle";
import type { ApiResponse } from "../types/auth";
import { api, unwrap } from "./api";
import { getApiErrorMessage } from "../utils/apiErrors";

export interface VehicleAvailabilityRequest {
  licensePlate: string;
  vinOrSerialNumber: string;
}

export interface VehicleAvailabilityResponse {
  success: boolean;
  duplicateField: "licensePlate" | "vinOrSerialNumber" | null;
  message: string;
}

export interface SaveVehicleResponse {
  success: boolean;
  message: string;
  data: {
    vehicleId: string;
    completed: boolean;
    nextStep: "contactos";
  } | null;
}

interface VehicleApiRecord {
  id?: string;
}

interface VehicleApiPayload {
  vehicleType: "Motorcycle" | "Scooter";
  brand: string;
  model: string;
  year: number;
  alias: string;
  primaryUse: "Personal" | "Work" | "Delivery" | "Mixed" | "Other";
  color: string;
  plateNumber: string;
  vin: string;
  usageFrequency: "Daily" | "Weekly" | "Occasional";
  saveMode: "Continue";
}

function readVehicleId(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as { vehicle?: VehicleApiRecord; id?: string };
  return source.vehicle?.id ?? source.id ?? null;
}

function toApiVehicleType(vehicleType: VehicleFormData["vehicleType"]): VehicleApiPayload["vehicleType"] {
  return vehicleType === "motoneta" ? "Scooter" : "Motorcycle";
}

function toApiPrimaryUse(mainUse: VehicleFormData["mainUse"]): VehicleApiPayload["primaryUse"] {
  switch (mainUse) {
    case "trabajo_reparto":
      return "Delivery";
    case "mixto":
      return "Mixed";
    case "escuela":
    case "recreativo":
    case "viajes_largos":
      return "Other";
    case "personal":
    default:
      return "Personal";
  }
}

function toApiUsageFrequency(useFrequency: VehicleFormData["useFrequency"]): VehicleApiPayload["usageFrequency"] {
  switch (useFrequency) {
    case "diario":
    case "cuatro_seis_semana":
      return "Daily";
    case "dos_tres_semana":
    case "semanal":
      return "Weekly";
    case "ocasional":
    default:
      return "Occasional";
  }
}

function toApiPayload(data: VehicleFormData): VehicleApiPayload {
  return {
    vehicleType: toApiVehicleType(data.vehicleType),
    brand: data.brand === "Otra" && data.customBrand.trim() ? data.customBrand.trim() : data.brand.trim(),
    model: data.model.trim(),
    year: typeof data.year === "number" ? data.year : Number(data.year),
    alias: data.alias.trim(),
    primaryUse: toApiPrimaryUse(data.mainUse),
    color: data.color.trim(),
    plateNumber: data.licensePlate.trim().toUpperCase(),
    vin: data.vinOrSerialNumber.trim().toUpperCase(),
    usageFrequency: toApiUsageFrequency(data.useFrequency),
    saveMode: "Continue",
  };
}

export async function checkVehicleAvailability(_data: VehicleAvailabilityRequest): Promise<VehicleAvailabilityResponse> {
  return {
    success: true,
    duplicateField: null,
    message: "Vehículo disponible para registro",
  };
}

export async function saveVehicle(_data: VehicleFormData): Promise<SaveVehicleResponse> {
  try {
    const response = await api.post<ApiResponse<unknown>>("/api/v1/vehicles", toApiPayload(_data));
    const data = unwrap<unknown>(response);
    const vehicleId = readVehicleId(data);

    if (!vehicleId) {
      return { success: false, message: "No pudimos confirmar el vehículo registrado", data: null };
    }

    return {
      success: true,
      message: "Vehículo registrado correctamente",
      data: {
        vehicleId,
        completed: true,
        nextStep: "contactos",
      },
    };
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error), data: null };
  }
}
