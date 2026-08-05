import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertMessage } from "../../../components/common/AlertMessage/AlertMessage";
import { Button } from "../../../components/common/Button/Button";
import { FileDropzone } from "../../../components/common/FileDropzone/FileDropzone";
import { FormSection } from "../../../components/common/FormSection/FormSection";
import { Input } from "../../../components/common/Input/Input";
import { Select, type SelectOption } from "../../../components/common/Select/Select";
import { Textarea } from "../../../components/common/Textarea/Textarea";
import { SetupLayout } from "../../../layouts/SetupLayout/SetupLayout";
import { getDriverProfileDraft, saveDriverProfileDraft } from "../../../services/profileDraftService";
import { saveDriverProfile, type DriverProfileFormData } from "../../../services/profileService";
import { getActiveUserId, getSession, updateSession } from "../../../services/sessionService";
import "./ProfileSetup.css";

interface DriverProfileErrors {
  fullName?: string;
  birthDate?: string;
  personalId?: string;
  phone?: string;
  email?: string;
  city?: string;
  address?: string;
  medicalConditions?: string;
  bloodType?: string;
  emergencyContactFullName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  licenseFile?: string;
  form?: string;
}

const cityOptions: SelectOption[] = [
  { label: "Ciudad de México", value: "Ciudad de México" },
  { label: "Tula de Allende", value: "Tula de Allende" },
  { label: "Pachuca", value: "Pachuca" },
  { label: "Querétaro", value: "Querétaro" },
  { label: "Puebla", value: "Puebla" },
  { label: "Otra", value: "Otra" },
];

const bloodTypeOptions: SelectOption[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "No lo sé"].map((value) => ({
  label: value,
  value,
}));

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function isAdult(birthDate: string) {
  const birth = new Date(`${birthDate}T00:00:00`);
  const today = new Date();
  const adultDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  return birth <= adultDate;
}

function validateProfile(data: DriverProfileFormData): DriverProfileErrors {
  const errors: DriverProfileErrors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const idPattern = /^[A-Z0-9]+$/;
  const phoneDigits = normalizePhone(data.phone);
  const emergencyPhoneDigits = normalizePhone(data.emergencyContact.phone);
  const today = new Date();
  const selectedBirthDate = data.birthDate ? new Date(`${data.birthDate}T00:00:00`) : null;

  if (data.fullName.trim().length < 3) {
    errors.fullName = "Ingresa tu nombre completo";
  }

  if (!data.birthDate) {
    errors.birthDate = "Ingresa tu fecha de nacimiento";
  } else if (selectedBirthDate && selectedBirthDate > today) {
    errors.birthDate = "La fecha de nacimiento no puede ser futura";
  } else if (!isAdult(data.birthDate)) {
    errors.birthDate = "Debes tener al menos 18 años para continuar";
  }

  if (data.personalId.trim().length < 8 || !idPattern.test(data.personalId.trim())) {
    errors.personalId = "Ingresa un CURP o ID válido de al menos 8 caracteres";
  }

  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    errors.phone = "Ingresa un número de teléfono válido";
  }

  if (!data.email.trim()) {
    errors.email = "El correo electrónico es obligatorio.";
  } else if (!emailPattern.test(data.email.trim())) {
    errors.email = "Ingresa un correo electrónico válido.";
  }

  if (!data.city) {
    errors.city = "Selecciona una ciudad";
  }

  if (data.address.trim().length < 8) {
    errors.address = "Ingresa una dirección válida";
  }

  if (data.medicalConditions.length > 300) {
    errors.medicalConditions = "Máximo 300 caracteres";
  }

  if (!data.bloodType) {
    errors.bloodType = "Selecciona tu tipo de sangre";
  }

  if (data.emergencyContact.fullName.trim().length < 3) {
    errors.emergencyContactFullName = "Ingresa el nombre del contacto";
  }

  if (!data.emergencyContact.relationship.trim()) {
    errors.emergencyContactRelationship = "Ingresa la relación o parentesco";
  }

  if (emergencyPhoneDigits.length < 10 || emergencyPhoneDigits.length > 15) {
    errors.emergencyContactPhone = "Ingresa un número de teléfono válido";
  }

  return errors;
}

function getInitialFormData(): DriverProfileFormData {
  const session = getSession();

  return {
    fullName: session?.name ?? "",
    birthDate: "",
    personalId: "",
    phone: "",
    email: session?.email ?? "",
    city: "",
    address: "",
    medicalConditions: "",
    bloodType: "",
    emergencyContact: {
      fullName: "",
      relationship: "",
      phone: "",
    },
    licenseFile: null,
  };
}

export function ProfileSetup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<DriverProfileFormData>(getInitialFormData);
  const [errors, setErrors] = useState<DriverProfileErrors>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const userId = getActiveUserId();
    const draft = userId ? getDriverProfileDraft(userId) : null;

    if (!draft) {
      return;
    }

    setFormData((current) => ({
      ...current,
      ...draft,
      email: current.email || draft.email,
      medicalConditions: "",
      licenseFile: null,
    }));
    setInfoMessage("Se recuperó tu borrador anterior");
  }, []);

  const updateField = <Field extends keyof DriverProfileFormData>(
    field: Field,
    value: DriverProfileFormData[Field],
  ) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  };

  const updateEmergencyContact = <Field extends keyof DriverProfileFormData["emergencyContact"]>(
    field: Field,
    value: DriverProfileFormData["emergencyContact"][Field],
  ) => {
    setFormData((current) => ({
      ...current,
      emergencyContact: { ...current.emergencyContact, [field]: value },
    }));
    setErrors((current) => ({
      ...current,
      [`emergencyContact${field.charAt(0).toUpperCase()}${field.slice(1)}`]: undefined,
      form: undefined,
    }));
  };

  const focusFirstError = (nextErrors: DriverProfileErrors) => {
    const firstErrorKey = Object.keys(nextErrors)[0];

    if (!firstErrorKey) {
      return;
    }

    window.setTimeout(() => {
      const element = document.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        `[data-field="${firstErrorKey}"]`,
      );
      element?.focus();
      element?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 0);
  };

  const handleSaveDraft = () => {
    const userId = getActiveUserId();

    if (userId) {
      saveDriverProfileDraft(userId, formData);
    }

    setSuccessMessage("Borrador guardado correctamente");
    setInfoMessage("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setSuccessMessage("");
    setInfoMessage("");

    const nextErrors = validateProfile(formData);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await saveDriverProfile(formData);
      setSuccessMessage(response.message);
      updateSession({ currentSetupStep: response.data.nextStep });
      window.setTimeout(() => navigate("/configuracion/motocicleta"), 700);
    } catch {
      setErrors({ form: "No pudimos guardar tu perfil. Inténtalo nuevamente." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SetupLayout activeStep="perfil">
      <div className="profile-setup">
        <header className="profile-setup__header">
          <p>Configuración inicial</p>
          <h1>Completa tu perfil</h1>
          <span>Tu información nos ayuda a responder mejor en caso de emergencia.</span>
        </header>

        <form className="profile-setup__form" noValidate onSubmit={handleSubmit}>
          {errors.form ? <AlertMessage variant="error">{errors.form}</AlertMessage> : null}
          {infoMessage ? <AlertMessage variant="info">{infoMessage}</AlertMessage> : null}
          {successMessage ? <AlertMessage variant="success">{successMessage}</AlertMessage> : null}

          <FormSection title="Datos personales" description="Usa datos reales y verificables para tu cuenta MotoSOS.">
            <div className="profile-setup__grid">
              <div className="profile-setup__column">
                <Input data-field="fullName" error={errors.fullName} id="fullName" label="Nombre completo" name="fullName" onChange={(event) => updateField("fullName", event.target.value)} type="text" value={formData.fullName} />
                <Input data-field="personalId" error={errors.personalId} id="personalId" label="CURP / ID" name="personalId" onChange={(event) => updateField("personalId", event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} type="text" value={formData.personalId} />
                <Input data-field="email" disabled error={errors.email} id="profileEmail" label="Correo electrónico" name="email" onChange={(event) => updateField("email", event.target.value)} type="email" value={formData.email} />
                <Input data-field="address" error={errors.address} id="address" label="Dirección" name="address" onChange={(event) => updateField("address", event.target.value)} type="text" value={formData.address} />
                <Select data-field="bloodType" error={errors.bloodType} id="bloodType" label="Tipo de sangre" name="bloodType" onChange={(event) => updateField("bloodType", event.target.value)} options={bloodTypeOptions} placeholder="Selecciona una opción" value={formData.bloodType} />
              </div>

              <div className="profile-setup__column">
                <Input data-field="birthDate" error={errors.birthDate} id="birthDate" label="Fecha de nacimiento" name="birthDate" onChange={(event) => updateField("birthDate", event.target.value)} type="date" value={formData.birthDate} />
                <Input data-field="phone" error={errors.phone} id="phone" inputMode="tel" label="Teléfono móvil" name="phone" onChange={(event) => updateField("phone", event.target.value)} type="tel" value={formData.phone} />
                <Select data-field="city" error={errors.city} id="city" label="Ciudad" name="city" onChange={(event) => updateField("city", event.target.value)} options={cityOptions} placeholder="Selecciona tu ciudad" value={formData.city} />
                <div>
                  <Textarea data-field="medicalConditions" error={errors.medicalConditions} id="medicalConditions" label="Alergias / condiciones médicas" maxLength={300} name="medicalConditions" onChange={(event) => updateField("medicalConditions", event.target.value)} value={formData.medicalConditions} />
                  <p className="profile-setup__hint">Escribe 'Ninguna' si no tienes información que registrar.</p>
                  <p className="profile-setup__privacy">Esta información se utilizará únicamente para apoyar la atención durante una emergencia.</p>
                  <p className="profile-setup__counter" aria-live="polite">{formData.medicalConditions.length}/300 caracteres</p>
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection title="Seguridad" description="Agrega una referencia principal y una identificación opcional.">
            <div className="profile-setup__security-grid">
              <Input data-field="emergencyContactFullName" error={errors.emergencyContactFullName} id="emergencyContactFullName" label="Contacto principal de emergencia" name="emergencyContactFullName" onChange={(event) => updateEmergencyContact("fullName", event.target.value)} type="text" value={formData.emergencyContact.fullName} />
              <Input data-field="emergencyContactRelationship" error={errors.emergencyContactRelationship} id="emergencyContactRelationship" label="Relación o parentesco" name="emergencyContactRelationship" onChange={(event) => updateEmergencyContact("relationship", event.target.value)} type="text" value={formData.emergencyContact.relationship} />
              <Input data-field="emergencyContactPhone" error={errors.emergencyContactPhone} id="emergencyContactPhone" inputMode="tel" label="Teléfono del contacto" name="emergencyContactPhone" onChange={(event) => updateEmergencyContact("phone", event.target.value)} type="tel" value={formData.emergencyContact.phone} />
            </div>

            <FileDropzone
              error={errors.licenseFile}
              helpText="Sube una imagen clara y vigente."
              id="licenseFile"
              label="Identificación o licencia de conducir"
              onChange={(file, error) => {
                updateField("licenseFile", file);
                setErrors((current) => ({ ...current, licenseFile: error }));
              }}
              value={formData.licenseFile}
            />
          </FormSection>

          <div className="profile-setup__actions">
            <Button onClick={handleSaveDraft} type="button" variant="secondary">Guardar borrador</Button>
            <div>
              <Button onClick={() => navigate("/login")} type="button" variant="secondary">Volver</Button>
              <Button disabled={isSubmitting} isLoading={isSubmitting} loadingText="Guardando..." type="submit">Guardar y continuar</Button>
            </div>
          </div>
        </form>
      </div>
    </SetupLayout>
  );
}
