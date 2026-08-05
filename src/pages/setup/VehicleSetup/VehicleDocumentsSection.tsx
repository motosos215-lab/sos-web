import { FileDropzone } from "../../../components/common/FileDropzone/FileDropzone";
import { FormSection } from "../../../components/common/FormSection/FormSection";
import type { VehicleFormData } from "../../../types/vehicle";

interface VehicleDocumentsSectionProps {
  errors: {
    registrationDocument?: string;
    vehiclePhoto?: string;
  };
  onFileChange: (field: "vehiclePhoto" | "registrationDocument", file: File | null, error?: string) => void;
  values: Pick<VehicleFormData, "registrationDocument" | "vehiclePhoto">;
}

const imageMimeTypes = ["image/jpeg", "image/png", "image/webp"];
const imageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
const registrationMimeTypes = ["image/jpeg", "image/png", "application/pdf"];
const registrationExtensions = [".jpg", ".jpeg", ".png", ".pdf"];

export function VehicleDocumentsSection({ errors, onFileChange, values }: VehicleDocumentsSectionProps) {
  return (
    <FormSection
      title="Foto o documentación"
      description="Puedes agregar una foto y tu tarjeta de circulación. Estos documentos son opcionales durante esta etapa."
    >
      <div className="vehicle-setup__documents">
        <FileDropzone
          accept=".jpg,.jpeg,.png,.webp"
          allowedExtensions={imageExtensions}
          allowedMimeTypes={imageMimeTypes}
          error={errors.vehiclePhoto}
          fileTypesLabel="JPG, PNG o WEBP. Máximo 5 MB."
          helpText="Agrega una foto clara de tu vehículo si la tienes disponible."
          id="vehiclePhoto"
          invalidTypeMessage="Selecciona una foto JPG, PNG o WEBP."
          label="Foto del vehículo opcional"
          onChange={(file, error) => onFileChange("vehiclePhoto", file, error)}
          recommendationText="La foto es opcional y no se guardará en el almacenamiento del navegador."
          value={values.vehiclePhoto}
        />

        <FileDropzone
          accept=".jpg,.jpeg,.png,.pdf"
          allowedExtensions={registrationExtensions}
          allowedMimeTypes={registrationMimeTypes}
          error={errors.registrationDocument}
          fileTypesLabel="JPG, PNG o PDF. Máximo 5 MB."
          helpText="Adjunta tu tarjeta de circulación si quieres dejarla lista para revisión posterior."
          id="registrationDocument"
          invalidTypeMessage="Selecciona un archivo JPG, PNG o PDF."
          label="Tarjeta de circulación opcional"
          onChange={(file, error) => onFileChange("registrationDocument", file, error)}
          recommendationText="El documento es opcional y permanecerá solo en memoria durante esta sesión."
          value={values.registrationDocument}
        />
      </div>
    </FormSection>
  );
}
