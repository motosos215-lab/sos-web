import type { VehicleFormData } from "../types/vehicle";

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

const DUPLICATE_LICENSE_PLATE = "DUP-123";
const DUPLICATE_VIN_OR_SERIAL = "DUPLICADO1234567";

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

export async function checkVehicleAvailability(
  data: VehicleAvailabilityRequest,
): Promise<VehicleAvailabilityResponse> {
  await wait(350);

  if (data.licensePlate.trim().toUpperCase() === DUPLICATE_LICENSE_PLATE) {
    return {
      success: false,
      duplicateField: "licensePlate",
      message: "Esta placa ya está registrada en MotoSOS",
    };
  }

  if (data.vinOrSerialNumber.trim().toUpperCase() === DUPLICATE_VIN_OR_SERIAL) {
    return {
      success: false,
      duplicateField: "vinOrSerialNumber",
      message: "Este VIN o número de serie ya está registrado",
    };
  }

  return {
    success: true,
    duplicateField: null,
    message: "Vehículo disponible para registro",
  };
}

export async function saveVehicle(_data: VehicleFormData): Promise<SaveVehicleResponse> {
  await wait(800);

  return {
    success: true,
    message: "Vehículo registrado correctamente",
    data: {
      vehicleId: "vehicle-demo-001",
      completed: true,
      nextStep: "contactos",
    },
  };
}
