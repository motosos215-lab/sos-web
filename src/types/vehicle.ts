export type VehicleType = "motocicleta" | "motoneta";

export type VehicleMainUse = "personal" | "trabajo_reparto" | "escuela" | "recreativo" | "viajes_largos" | "mixto";

export type VehicleUseFrequency = "diario" | "cuatro_seis_semana" | "dos_tres_semana" | "semanal" | "ocasional";

export interface VehicleFormData {
  vehicleType: VehicleType | "";
  brand: string;
  customBrand: string;
  model: string;
  year: number | "";
  color: string;
  licensePlate: string;
  vinOrSerialNumber: string;
  alias: string;
  mainUse: VehicleMainUse | "";
  useFrequency: VehicleUseFrequency | "";
  circulationCity: string;
  customCirculationCity: string;
  vehiclePhoto: File | null;
  registrationDocument: File | null;
}

export type VehicleDraft = Omit<VehicleFormData, "vehiclePhoto" | "registrationDocument">;
