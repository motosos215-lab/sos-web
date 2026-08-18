import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertMessage } from "../../../components/common/AlertMessage/AlertMessage";
import { Button } from "../../../components/common/Button/Button";
import { FormSection } from "../../../components/common/FormSection/FormSection";
import { Input } from "../../../components/common/Input/Input";
import { Select, type SelectOption } from "../../../components/common/Select/Select";
import { SetupLayout } from "../../../layouts/SetupLayout/SetupLayout";
import { clearVehicleDraft, getVehicleDraft, saveVehicleDraft } from "../../../services/vehicleDraftService";
import { checkVehicleAvailability, saveVehicle } from "../../../services/vehicleService";
import { getSession, updateSession } from "../../../services/sessionService";
import type { VehicleFormData, VehicleMainUse, VehicleType, VehicleUseFrequency } from "../../../types/vehicle";
import { FormErrorSummary } from "./FormErrorSummary";
import { VehicleDocumentsSection } from "./VehicleDocumentsSection";
import { VehicleTypeSelector } from "./VehicleTypeSelector";
import "./VehicleSetup.css";

interface VehicleErrors {
  vehicleType?: string;
  brand?: string;
  customBrand?: string;
  model?: string;
  year?: string;
  color?: string;
  licensePlate?: string;
  vinOrSerialNumber?: string;
  alias?: string;
  mainUse?: string;
  useFrequency?: string;
  circulationCity?: string;
  customCirculationCity?: string;
  vehiclePhoto?: string;
  registrationDocument?: string;
  form?: string;
}

const initialFormData: VehicleFormData = {
  vehicleType: "",
  brand: "",
  customBrand: "",
  model: "",
  year: "",
  color: "",
  licensePlate: "",
  vinOrSerialNumber: "",
  alias: "",
  mainUse: "",
  useFrequency: "",
  circulationCity: "",
  customCirculationCity: "",
  vehiclePhoto: null,
  registrationDocument: null,
};

const brandOptions: SelectOption[] = [
  "Italika",
  "Honda",
  "Yamaha",
  "Suzuki",
  "Kawasaki",
  "Bajaj",
  "Vento",
  "KTM",
  "BMW Motorrad",
  "Ducati",
  "Harley-Davidson",
  "Otra",
].map((value) => ({ label: value, value }));

const mainUseOptions: SelectOption[] = [
  { label: "Traslado personal", value: "personal" },
  { label: "Trabajo o reparto", value: "trabajo_reparto" },
  { label: "Traslado a escuela o universidad", value: "escuela" },
  { label: "Uso recreativo", value: "recreativo" },
  { label: "Viajes largos", value: "viajes_largos" },
  { label: "Uso mixto", value: "mixto" },
];

const frequencyOptions: SelectOption[] = [
  { label: "Todos los días", value: "diario" },
  { label: "De 4 a 6 días por semana", value: "cuatro_seis_semana" },
  { label: "De 2 a 3 días por semana", value: "dos_tres_semana" },
  { label: "Una vez por semana", value: "semanal" },
  { label: "Ocasionalmente", value: "ocasional" },
];

const cityOptions: SelectOption[] = ["Tula de Allende", "Pachuca", "Ciudad de México", "Querétaro", "Puebla", "Toluca", "Otra"].map(
  (value) => ({ label: value, value }),
);

const fieldLabels: Partial<Record<string, string>> = {
  vehicleType: "Tipo de vehículo",
  brand: "Marca",
  customBrand: "Especifica la marca",
  model: "Modelo",
  year: "Año",
  color: "Color",
  licensePlate: "Placas",
  vinOrSerialNumber: "VIN o número de serie",
  alias: "Alias del vehículo",
  mainUse: "Uso principal",
  useFrequency: "Frecuencia de uso",
  circulationCity: "Ciudad de circulación",
  customCirculationCity: "Especifica la ciudad",
  vehiclePhoto: "Foto del vehículo",
  registrationDocument: "Tarjeta de circulación",
};

const fieldOrder: Array<keyof VehicleErrors> = [
  "vehicleType",
  "brand",
  "customBrand",
  "model",
  "year",
  "color",
  "licensePlate",
  "vinOrSerialNumber",
  "alias",
  "mainUse",
  "useFrequency",
  "circulationCity",
  "customCirculationCity",
];

function getYearOptions(): SelectOption[] {
  const currentYear = new Date().getFullYear();
  const options: SelectOption[] = [];

  for (let year = currentYear; year >= 1980; year -= 1) {
    options.push({ label: String(year), value: String(year) });
  }

  return options;
}

const yearOptions = getYearOptions();

function sanitizeVehicleData(data: VehicleFormData): VehicleFormData {
  return {
    ...data,
    customBrand: data.brand === "Otra" ? data.customBrand.trim() : "",
    model: data.model.trim(),
    color: data.color.trim(),
    licensePlate: data.licensePlate.trim().toUpperCase(),
    vinOrSerialNumber: data.vinOrSerialNumber.replace(/\s/g, "").toUpperCase(),
    alias: data.alias.trim(),
    customCirculationCity: data.circulationCity === "Otra" ? data.customCirculationCity.trim() : "",
  };
}

function validateVehicle(data: VehicleFormData): VehicleErrors {
  const errors: VehicleErrors = {};
  const currentYear = new Date().getFullYear();
  const modelPattern = /^[\p{L}0-9 -]+$/u;
  const colorPattern = /^[\p{L}\s.-]+$/u;
  const licensePlatePattern = /^[A-Z0-9-]{4,12}$/;
  const vinPattern = /^[A-Z0-9]{8,20}$/;

  if (!data.vehicleType) {
    errors.vehicleType = "Selecciona el tipo de vehículo";
  }

  if (!data.brand) {
    errors.brand = "Selecciona la marca del vehículo";
  }

  if (data.brand === "Otra" && data.customBrand.trim().length < 2) {
    errors.customBrand = "Especifica la marca";
  }

  if (data.model.length < 2 || data.model.length > 50 || !modelPattern.test(data.model)) {
    errors.model = "Ingresa el modelo del vehículo";
  }

  if (typeof data.year !== "number" || data.year > currentYear || data.year < 1980) {
    errors.year = "Selecciona el año del vehículo";
  }

  if (data.color.length < 3 || data.color.length > 30 || !colorPattern.test(data.color)) {
    errors.color = "Ingresa el color del vehículo";
  }

  if (!licensePlatePattern.test(data.licensePlate)) {
    errors.licensePlate = "Ingresa una placa válida";
  }

  if (!vinPattern.test(data.vinOrSerialNumber)) {
    errors.vinOrSerialNumber = "Ingresa un VIN o número de serie válido";
  }

  if (data.alias.length < 2 || data.alias.length > 40) {
    errors.alias = "Agrega un alias para identificar tu vehículo";
  }

  if (!data.mainUse) {
    errors.mainUse = "Selecciona el uso principal del vehículo";
  }

  if (!data.useFrequency) {
    errors.useFrequency = "Selecciona la frecuencia de uso";
  }

  if (!data.circulationCity) {
    errors.circulationCity = "Selecciona la ciudad principal de circulación";
  }

  if (data.circulationCity === "Otra" && data.customCirculationCity.trim().length < 2) {
    errors.customCirculationCity = "Especifica la ciudad";
  }

  return errors;
}

function focusFirstError(errors: VehicleErrors) {
  const firstErrorKey = fieldOrder.find((field) => Boolean(errors[field]));

  if (!firstErrorKey) {
    return;
  }

  window.setTimeout(() => {
    const element = document.querySelector<HTMLElement>(`[data-field="${firstErrorKey}"]`);
    element?.focus();
    element?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, 0);
}

function getFieldErrors(errors: VehicleErrors): Partial<Record<string, string>> {
  const { form: _form, ...fieldErrors } = errors;
  return fieldErrors;
}

export function VehicleSetup() {
  const navigate = useNavigate();
  const session = getSession();
  const [formData, setFormData] = useState<VehicleFormData>(initialFormData);
  const [errors, setErrors] = useState<VehicleErrors>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasRegisteredVehicle = Boolean(session?.vehicleRegistered);

  useEffect(() => {
    const draft = getVehicleDraft();

    if (!draft) {
      return;
    }

    setFormData((current) => ({
      ...current,
      ...draft,
      vehiclePhoto: null,
      registrationDocument: null,
    }));
    setInfoMessage("Se recuperó tu borrador anterior");
  }, []);

  const updateField = <Field extends keyof VehicleFormData>(field: Field, value: VehicleFormData[Field]) => {
    setFormData((current) => {
      const next = { ...current, [field]: value };

      if (field === "brand" && value !== "Otra") {
        next.customBrand = "";
      }

      if (field === "circulationCity" && value !== "Otra") {
        next.customCirculationCity = "";
      }

      return next;
    });
    setErrors((current) => ({
      ...current,
      [field]: undefined,
      ...(field === "brand" && value !== "Otra" ? { customBrand: undefined } : {}),
      ...(field === "circulationCity" && value !== "Otra" ? { customCirculationCity: undefined } : {}),
      form: undefined,
    }));
    setSuccessMessage("");
  };

  const handleFileChange = (field: "vehiclePhoto" | "registrationDocument", file: File | null, error?: string) => {
    updateField(field, file);
    setErrors((current) => ({ ...current, [field]: error, form: undefined }));
  };

  const handleSaveDraft = () => {
    saveVehicleDraft(sanitizeVehicleData(formData));
    setSuccessMessage("Borrador del vehículo guardado correctamente");
    setInfoMessage("");
  };

  const handleBack = () => {
    saveVehicleDraft(sanitizeVehicleData(formData));
    navigate("/configuracion/perfil");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setSuccessMessage("");
    setInfoMessage("");

    const sanitizedData = sanitizeVehicleData(formData);
    setFormData(sanitizedData);

    const nextErrors = validateVehicle(sanitizedData);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const availability = await checkVehicleAvailability({
        licensePlate: sanitizedData.licensePlate,
        vinOrSerialNumber: sanitizedData.vinOrSerialNumber,
      });

      if (!availability.success && availability.duplicateField) {
        const duplicateErrors: VehicleErrors = {
          [availability.duplicateField]: availability.message,
        };
        setErrors(duplicateErrors);
        focusFirstError(duplicateErrors);
        return;
      }

      const response = await saveVehicle(sanitizedData);

      if (!response.success || !response.data) {
        setErrors({ form: "No pudimos guardar el vehículo. Inténtalo nuevamente." });
        return;
      }

      updateSession({
        currentSetupStep: response.data.nextStep,
        plan: "basico",
        vehicleRegistered: true,
        vehicleId: response.data.vehicleId,
      });
      clearVehicleDraft();
      setSuccessMessage(response.message);
      window.setTimeout(() => navigate("/configuracion/contactos"), 700);
    } catch {
      setErrors({ form: "No pudimos guardar el vehículo. Inténtalo nuevamente." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SetupLayout activeStep="motocicleta">
      <div className="vehicle-setup">
        <header className="vehicle-setup__header">
          <p>Configuración inicial</p>
          <h1>Registra tu motocicleta o motoneta</h1>
          <span>Este vehículo será utilizado como referencia durante tus viajes monitoreados.</span>
        </header>

        <form className="vehicle-setup__form" noValidate onSubmit={handleSubmit}>
          {errors.form ? <AlertMessage variant="error">{errors.form}</AlertMessage> : null}
          {infoMessage ? <AlertMessage variant="info">{infoMessage}</AlertMessage> : null}
          {hasRegisteredVehicle ? (
            <AlertMessage variant="warning">
              Ya registraste el vehículo permitido por tu plan. Puedes editar el vehículo existente.
            </AlertMessage>
          ) : (
            <AlertMessage variant="info">Tu plan Básico permite registrar un vehículo.</AlertMessage>
          )}
          {successMessage ? <AlertMessage variant="success">{successMessage}</AlertMessage> : null}
          <FormErrorSummary errors={getFieldErrors(errors)} labels={fieldLabels} />

          <FormSection
            title="Datos del vehículo"
            description="La información del vehículo se utilizará únicamente para identificarlo durante viajes e incidentes."
          >
            <VehicleTypeSelector
              error={errors.vehicleType}
              onChange={(value: VehicleType) => updateField("vehicleType", value)}
              value={formData.vehicleType}
            />

            <div className="vehicle-setup__columns">
              <div className="vehicle-setup__column">
                <Select
                  data-field="brand"
                  error={errors.brand}
                  id="brand"
                  label="Marca"
                  name="brand"
                  onChange={(event) => updateField("brand", event.target.value)}
                  options={brandOptions}
                  placeholder="Ej. Italika"
                  value={formData.brand}
                />
                {formData.brand === "Otra" ? (
                  <Input
                    data-field="customBrand"
                    error={errors.customBrand}
                    id="customBrand"
                    label="Especifica la marca"
                    maxLength={50}
                    name="customBrand"
                    onChange={(event) => updateField("customBrand", event.target.value)}
                    placeholder="Ej. Vento"
                    type="text"
                    value={formData.customBrand}
                  />
                ) : null}
                <Input
                  data-field="model"
                  error={errors.model}
                  id="model"
                  label="Modelo"
                  maxLength={50}
                  name="model"
                  onChange={(event) => updateField("model", event.target.value)}
                  placeholder="Ej. FT150"
                  type="text"
                  value={formData.model}
                />
                <Select
                  data-field="year"
                  error={errors.year}
                  id="year"
                  label="Año"
                  name="year"
                  onChange={(event) => updateField("year", event.target.value ? Number(event.target.value) : "")}
                  options={yearOptions}
                  placeholder="Ej. 2024"
                  value={formData.year}
                />
                <div>
                  <Input
                    aria-describedby="alias-help"
                    data-field="alias"
                    error={errors.alias}
                    id="alias"
                    label="Alias del vehículo"
                    maxLength={40}
                    name="alias"
                    onChange={(event) => updateField("alias", event.target.value)}
                    placeholder="Ej. Moto diaria"
                    type="text"
                    value={formData.alias}
                  />
                  <p className="vehicle-setup__hint" id="alias-help">
                    Este alias te ayudará a identificar tu vehículo fácilmente.
                  </p>
                </div>
              </div>

              <div className="vehicle-setup__column">
                <Input
                  data-field="color"
                  error={errors.color}
                  id="color"
                  label="Color"
                  maxLength={30}
                  name="color"
                  onChange={(event) => updateField("color", event.target.value)}
                  placeholder="Ej. Negro mate"
                  type="text"
                  value={formData.color}
                />
                <div>
                  <Input
                    aria-describedby="licensePlate-help"
                    data-field="licensePlate"
                    error={errors.licensePlate}
                    id="licensePlate"
                    label="Placas"
                    maxLength={12}
                    name="licensePlate"
                    onBlur={() => updateField("licensePlate", formData.licensePlate.trim().toUpperCase())}
                    onChange={(event) => updateField("licensePlate", event.target.value.toUpperCase())}
                    placeholder="Ej. ABC-123"
                    type="text"
                    value={formData.licensePlate}
                  />
                  <p className="vehicle-setup__hint" id="licensePlate-help">
                    Escribe la placa sin espacios innecesarios.
                  </p>
                </div>
                <div>
                  <Input
                    aria-describedby="vinOrSerialNumber-help"
                    data-field="vinOrSerialNumber"
                    error={errors.vinOrSerialNumber}
                    id="vinOrSerialNumber"
                    label="VIN o número de serie"
                    maxLength={20}
                    name="vinOrSerialNumber"
                    onBlur={() => updateField("vinOrSerialNumber", formData.vinOrSerialNumber.replace(/\s/g, "").toUpperCase())}
                    onChange={(event) => updateField("vinOrSerialNumber", event.target.value.toUpperCase().replace(/\s/g, ""))}
                    placeholder="Ej. 3H1PCX2A9LD123456"
                    type="text"
                    value={formData.vinOrSerialNumber}
                  />
                  <p className="vehicle-setup__hint" id="vinOrSerialNumber-help">
                    Puedes encontrarlo en el chasis o en la tarjeta de circulación.
                  </p>
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection
            title="Uso del vehículo"
            description="Indica cómo usas normalmente este vehículo para contextualizar tus viajes monitoreados."
          >
            <div className="vehicle-setup__columns">
              <div className="vehicle-setup__column">
                <Select
                  data-field="mainUse"
                  error={errors.mainUse}
                  id="mainUse"
                  label="Uso principal"
                  name="mainUse"
                  onChange={(event) => updateField("mainUse", event.target.value as VehicleMainUse | "")}
                  options={mainUseOptions}
                  placeholder="Ej. Trabajo"
                  value={formData.mainUse}
                />
                <Select
                  data-field="circulationCity"
                  error={errors.circulationCity}
                  id="circulationCity"
                  label="Ciudad de circulación"
                  name="circulationCity"
                  onChange={(event) => updateField("circulationCity", event.target.value)}
                  options={cityOptions}
                  placeholder="Ej. Pachuca"
                  value={formData.circulationCity}
                />
                {formData.circulationCity === "Otra" ? (
                  <Input
                    data-field="customCirculationCity"
                    error={errors.customCirculationCity}
                    id="customCirculationCity"
                    label="Especifica la ciudad"
                    maxLength={60}
                    name="customCirculationCity"
                    onChange={(event) => updateField("customCirculationCity", event.target.value)}
                    placeholder="Ej. Tulancingo"
                    type="text"
                    value={formData.customCirculationCity}
                  />
                ) : null}
              </div>

              <div className="vehicle-setup__column">
                <Select
                  data-field="useFrequency"
                  error={errors.useFrequency}
                  id="useFrequency"
                  label="Frecuencia de uso"
                  name="useFrequency"
                  onChange={(event) => updateField("useFrequency", event.target.value as VehicleUseFrequency | "")}
                  options={frequencyOptions}
                  placeholder="Ej. Diario"
                  value={formData.useFrequency}
                />
              </div>
            </div>
          </FormSection>

          <VehicleDocumentsSection
            errors={{
              registrationDocument: errors.registrationDocument,
              vehiclePhoto: errors.vehiclePhoto,
            }}
            onFileChange={handleFileChange}
            values={{
              registrationDocument: formData.registrationDocument,
              vehiclePhoto: formData.vehiclePhoto,
            }}
          />

          <div className="vehicle-setup__actions">
            <Button onClick={handleSaveDraft} type="button" variant="secondary">
              Guardar borrador
            </Button>
            <div>
              <Button onClick={handleBack} type="button" variant="secondary">
                Volver
              </Button>
              <Button disabled={isSubmitting} isLoading={isSubmitting} loadingText="Guardando vehículo..." type="submit">
                Guardar y continuar
              </Button>
            </div>
          </div>
        </form>
      </div>
    </SetupLayout>
  );
}
