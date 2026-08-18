import { FormEvent, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertMessage } from "../../../components/common/AlertMessage/AlertMessage";
import { Button } from "../../../components/common/Button/Button";
import { FileDropzone } from "../../../components/common/FileDropzone/FileDropzone";
import { FormSection } from "../../../components/common/FormSection/FormSection";
import { Input } from "../../../components/common/Input/Input";
import { Select, type SelectOption } from "../../../components/common/Select/Select";
import { Textarea } from "../../../components/common/Textarea/Textarea";
import { SetupLayout } from "../../../layouts/SetupLayout/SetupLayout";
import { getCurrentUser } from "../../../services/authService";
import { getOnboardingStatus, getSetupStepFromOnboardingStatus, resolveOnboardingRoute } from "../../../services/onboardingService";
import { clearDriverProfileDraft, getDriverProfileDraft, saveDriverProfileDraft } from "../../../services/profileDraftService";
import {
  getMyProfile,
  mapDriverProfileFormToPayload,
  saveMyProfile,
  type DriverProfileFormData,
  type MyProfile,
} from "../../../services/profileService";
import { getActiveUserId, getSession, updateSession } from "../../../services/sessionService";
import type { ApiUserProfile } from "../../../types/auth";
import { getApiErrorMessage } from "../../../utils/apiErrors";
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

type DriverProfileFieldErrorKey = Exclude<keyof DriverProfileErrors, "form">;

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

const emergencyRelationshipOptions: SelectOption[] = [
  "Madre",
  "Padre",
  "Hermana",
  "Hermano",
  "Pareja",
  "Esposa",
  "Esposo",
  "Hija",
  "Hijo",
  "Amiga",
  "Amigo",
  "Familiar",
  "Médico",
  "Otro",
].map((value) => ({ label: value, value }));

const emergencyRelationshipValues = new Set(emergencyRelationshipOptions.map((option) => option.value));

const fieldErrorLabels: Record<DriverProfileFieldErrorKey, string> = {
  fullName: "Nombre completo",
  birthDate: "Fecha de nacimiento",
  personalId: "CURP",
  phone: "Teléfono móvil",
  email: "Correo electrónico",
  city: "Ciudad",
  address: "Dirección",
  medicalConditions: "Alergias / condiciones médicas",
  bloodType: "Tipo de sangre",
  emergencyContactFullName: "Contacto principal de emergencia",
  emergencyContactRelationship: "Relación o parentesco",
  emergencyContactPhone: "Teléfono del contacto",
  licenseFile: "Identificación o licencia de conducir",
};

const fieldErrorOrder = Object.keys(fieldErrorLabels) as DriverProfileFieldErrorKey[];

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function normalizeEmergencyPhone(phone: string) {
  return normalizePhone(phone).slice(0, 10);
}

function normalizeNationalPhone(phone: string) {
  return normalizePhone(phone).slice(0, 10);
}

function validateEmergencyContactField<Field extends keyof DriverProfileFormData["emergencyContact"]>(
  field: Field,
  emergencyContact: DriverProfileFormData["emergencyContact"],
): DriverProfileErrors[`emergencyContact${Capitalize<Field>}`] {
  if (field === "fullName" && emergencyContact.fullName.trim().length < 3) {
    return "Ingresa el nombre del contacto";
  }

  if (field === "relationship" && !emergencyRelationshipValues.has(emergencyContact.relationship)) {
    return "Selecciona la relación o parentesco";
  }

  if (field === "phone") {
    const phoneDigits = normalizePhone(emergencyContact.phone);

    if (!/^\d{10}$/.test(phoneDigits) || /^0+$/.test(phoneDigits)) {
      return "Ingresa un teléfono de 10 dígitos";
    }
  }

  return undefined;
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
  const curpPattern = /^[A-Z0-9]{18}$/;
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

  if (!curpPattern.test(data.personalId.trim().toUpperCase())) {
    errors.personalId = "Ingresa una CURP válida de 18 caracteres";
  }

  if (!/^\d{10}$/.test(phoneDigits) || /^0+$/.test(phoneDigits)) {
    errors.phone = "Ingresa un teléfono de 10 dígitos sin lada";
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

  if (!emergencyRelationshipValues.has(data.emergencyContact.relationship)) {
    errors.emergencyContactRelationship = "Selecciona la relación o parentesco";
  }

  if (!/^\d{10}$/.test(emergencyPhoneDigits) || /^0+$/.test(emergencyPhoneDigits)) {
    errors.emergencyContactPhone = "Ingresa un teléfono de 10 dígitos";
  }

  return errors;
}

function getFirstFieldError(errors: DriverProfileErrors): { field: string; message: string } | null {
  const field = fieldErrorOrder.find((key) => Boolean(errors[key]));

  if (!field) {
    return null;
  }

  return { field: fieldErrorLabels[field], message: errors[field] ?? "Revisa este campo" };
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

function toDateInputValue(value: string | null | undefined): string {
  return typeof value === "string" && value.length >= 10 ? value.slice(0, 10) : "";
}

function mapProfileToFormData(profile: MyProfile, fallbackUser: ApiUserProfile | null): DriverProfileFormData {
  return {
    fullName: profile.fullName ?? fallbackUser?.fullName ?? "",
    birthDate: toDateInputValue(profile.dateOfBirth),
    personalId: profile.curpOrIdentifier ?? "",
    phone: normalizeNationalPhone(profile.phoneNumber ?? fallbackUser?.phoneNumber ?? ""),
    email: fallbackUser?.email ?? getSession()?.email ?? "",
    city: profile.primaryCity ?? "",
    address: profile.addressOrZone ?? "",
    medicalConditions: profile.medicalConditions ?? profile.allergies ?? "",
    bloodType: profile.bloodType ?? "",
    emergencyContact: {
      fullName: profile.provisionalEmergencyContactName ?? "",
      relationship: "",
      phone: normalizeEmergencyPhone(profile.provisionalEmergencyContactPhone ?? ""),
    },
    licenseFile: null,
  };
}

function mapUserToFormData(user: ApiUserProfile | null): DriverProfileFormData {
  const session = getSession();

  return {
    ...getInitialFormData(),
    fullName: user?.fullName ?? session?.name ?? "",
    phone: normalizeNationalPhone(user?.phoneNumber ?? ""),
    email: user?.email ?? session?.email ?? "",
  };
}

export function ProfileSetup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<DriverProfileFormData>(getInitialFormData);
  const [errors, setErrors] = useState<DriverProfileErrors>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileAllergies, setProfileAllergies] = useState("");

  const loadProfile = useCallback(async () => {
    const userId = getActiveUserId();
    const draft = userId ? getDriverProfileDraft(userId) : null;

    setIsLoadingProfile(true);
    setErrors({});
    setSuccessMessage("");
    setInfoMessage("");

    try {
      const user = await getCurrentUser();
      const profile = await getMyProfile();

      if (profile) {
        setFormData(mapProfileToFormData(profile, user));
        setProfileAllergies(profile.allergies ?? "");

        if (draft) {
          setInfoMessage("Existe un borrador local, pero se cargó la información guardada en MotoSOS.");
        }
      } else if (draft) {
        setFormData((current) => ({
          ...current,
          ...mapUserToFormData(user),
          ...draft,
          email: user.email || draft.email,
          medicalConditions: "",
          licenseFile: null,
        }));
        setProfileAllergies("");
        setInfoMessage("Se recuperó tu borrador anterior");
      } else {
        setFormData(mapUserToFormData(user));
        setProfileAllergies("");
      }
    } catch (error) {
      setErrors({ form: getApiErrorMessage(error) });
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateField = <Field extends keyof DriverProfileFormData>(field: Field, value: DriverProfileFormData[Field]) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  };

  const updateEmergencyContact = <Field extends keyof DriverProfileFormData["emergencyContact"]>(
    field: Field,
    value: DriverProfileFormData["emergencyContact"][Field],
  ) => {
    const errorKey = `emergencyContact${field.charAt(0).toUpperCase()}${field.slice(1)}` as keyof DriverProfileErrors;

    setFormData((current) => ({
      ...current,
      emergencyContact: { ...current.emergencyContact, [field]: value },
    }));
    setErrors((current) => ({ ...current, [errorKey]: undefined, form: undefined }));
  };

  const validateEmergencyContactOnBlur = <Field extends keyof DriverProfileFormData["emergencyContact"]>(field: Field) => {
    const errorKey = `emergencyContact${field.charAt(0).toUpperCase()}${field.slice(1)}` as keyof DriverProfileErrors;

    setErrors((current) => ({
      ...current,
      [errorKey]: validateEmergencyContactField(field, formData.emergencyContact),
      form: undefined,
    }));
  };

  const focusFirstError = (nextErrors: DriverProfileErrors) => {
    const firstErrorKey = Object.keys(nextErrors)[0];

    if (!firstErrorKey) {
      return;
    }

    window.setTimeout(() => {
      const element = document.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[data-field="${firstErrorKey}"]`);
      element?.focus({ preventScroll: true });
      element?.scrollIntoView({ block: "nearest" });
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
      const payload = mapDriverProfileFormToPayload(formData);
      await saveMyProfile({ ...payload, allergies: profileAllergies });

      const status = await getOnboardingStatus();
      const nextStep = getSetupStepFromOnboardingStatus(status, getSession()?.currentSetupStep);
      const setupCompleted = status.isCompleted === true || status.isConfirmed === true || nextStep === "completed";

      updateSession({
        setupCompleted,
        registrationStatus: setupCompleted ? "completed" : "pending",
        currentSetupStep: setupCompleted ? "completed" : nextStep,
        setupCompletedAt: setupCompleted ? getSession()?.setupCompletedAt || new Date().toISOString() : "",
        onboardingStatusSnapshot: status,
      });

      const userId = getActiveUserId();
      clearDriverProfileDraft(userId ?? undefined);
      setSuccessMessage("Perfil guardado correctamente");
      navigate(resolveOnboardingRoute(status, getSession()));
    } catch (error) {
      setErrors({ form: getApiErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <SetupLayout activeStep="perfil">
        <div className="profile-setup">
          <header className="profile-setup__header">
            <p>Configuración inicial</p>
            <h1>Completa tu perfil</h1>
            <span>Tu información nos ayuda a responder mejor en caso de emergencia.</span>
          </header>
          <AlertMessage variant="info">Cargando tu perfil...</AlertMessage>
        </div>
      </SetupLayout>
    );
  }

  const firstFieldError = getFirstFieldError(errors);

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
          {!errors.form && firstFieldError ? (
            <AlertMessage variant="error">
              Revisa el campo {firstFieldError.field}: {firstFieldError.message}
            </AlertMessage>
          ) : null}
          {infoMessage ? <AlertMessage variant="info">{infoMessage}</AlertMessage> : null}
          {successMessage ? <AlertMessage variant="success">{successMessage}</AlertMessage> : null}

          <FormSection title="Datos personales" description="Usa datos reales y verificables para tu cuenta MotoSOS.">
            <div className="profile-setup__grid">
              <div className="profile-setup__column">
                <Input
                  data-field="fullName"
                  error={errors.fullName}
                  id="fullName"
                  label="Nombre completo"
                  name="fullName"
                  onChange={(event) => updateField("fullName", event.target.value)}
                  placeholder="Ej. Juan Pérez"
                  type="text"
                  value={formData.fullName}
                />
                <Input
                  data-field="personalId"
                  error={errors.personalId}
                  id="personalId"
                  label="CURP"
                  maxLength={18}
                  name="personalId"
                  onChange={(event) => updateField("personalId", event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  placeholder="Ej. PEHJ900101HDFRNN09"
                  type="text"
                  value={formData.personalId}
                />
                <Input
                  data-field="email"
                  disabled
                  error={errors.email}
                  id="profileEmail"
                  label="Correo electrónico"
                  name="email"
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="ejemplo@correo.com"
                  type="email"
                  value={formData.email}
                />
                <Input
                  data-field="address"
                  error={errors.address}
                  id="address"
                  label="Dirección"
                  name="address"
                  onChange={(event) => updateField("address", event.target.value)}
                  placeholder="Ej. Av. Hidalgo 123, Col. Centro"
                  type="text"
                  value={formData.address}
                />
                <Select
                  data-field="bloodType"
                  error={errors.bloodType}
                  id="bloodType"
                  label="Tipo de sangre"
                  name="bloodType"
                  onChange={(event) => updateField("bloodType", event.target.value)}
                  options={bloodTypeOptions}
                  placeholder="Ej. O+"
                  value={formData.bloodType}
                />
              </div>

              <div className="profile-setup__column">
                <Input
                  data-field="birthDate"
                  error={errors.birthDate}
                  id="birthDate"
                  label="Fecha de nacimiento"
                  name="birthDate"
                  onChange={(event) => updateField("birthDate", event.target.value)}
                  type="date"
                  value={formData.birthDate}
                />
                <Input
                  data-field="phone"
                  error={errors.phone}
                  id="phone"
                  inputMode="numeric"
                  label="Teléfono móvil"
                  maxLength={10}
                  name="phone"
                  onChange={(event) => updateField("phone", normalizeNationalPhone(event.target.value))}
                  pattern="[0-9]{10}"
                  placeholder="Ej. 7711234567"
                  type="text"
                  value={formData.phone}
                />
                <Select
                  data-field="city"
                  error={errors.city}
                  id="city"
                  label="Ciudad"
                  name="city"
                  onChange={(event) => updateField("city", event.target.value)}
                  options={cityOptions}
                  placeholder="Ej. Pachuca"
                  value={formData.city}
                />
                <div>
                  <Textarea
                    data-field="medicalConditions"
                    error={errors.medicalConditions}
                    id="medicalConditions"
                    label="Alergias / condiciones médicas"
                    maxLength={300}
                    name="medicalConditions"
                    onChange={(event) => updateField("medicalConditions", event.target.value)}
                    placeholder="Ej. Alergia a penicilina o ninguna"
                    value={formData.medicalConditions}
                  />
                  <p className="profile-setup__hint">Escribe 'Ninguna' si no tienes información que registrar.</p>
                  <p className="profile-setup__privacy">
                    Esta información se utilizará únicamente para apoyar la atención durante una emergencia.
                  </p>
                  <p className="profile-setup__counter" aria-live="polite">
                    {formData.medicalConditions.length}/300 caracteres
                  </p>
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection title="Seguridad" description="Agrega una referencia principal y una identificación opcional.">
            <div className="profile-setup__security-grid">
              <Input
                data-field="emergencyContactFullName"
                error={errors.emergencyContactFullName}
                id="emergencyContactFullName"
                label="Contacto principal de emergencia"
                name="emergencyContactFullName"
                onBlur={() => validateEmergencyContactOnBlur("fullName")}
                onChange={(event) => updateEmergencyContact("fullName", event.target.value)}
                placeholder="Ej. María Pérez"
                type="text"
                value={formData.emergencyContact.fullName}
              />
              <Select
                data-field="emergencyContactRelationship"
                error={errors.emergencyContactRelationship}
                id="emergencyContactRelationship"
                label="Relación o parentesco"
                name="emergencyContactRelationship"
                onBlur={() => validateEmergencyContactOnBlur("relationship")}
                onChange={(event) => updateEmergencyContact("relationship", event.target.value)}
                options={emergencyRelationshipOptions}
                placeholder="Ej. Madre"
                value={formData.emergencyContact.relationship}
              />
              <Input
                data-field="emergencyContactPhone"
                error={errors.emergencyContactPhone}
                id="emergencyContactPhone"
                inputMode="numeric"
                label="Teléfono del contacto"
                maxLength={10}
                name="emergencyContactPhone"
                onBlur={() => validateEmergencyContactOnBlur("phone")}
                onChange={(event) => updateEmergencyContact("phone", normalizeEmergencyPhone(event.target.value))}
                pattern="[0-9]{10}"
                placeholder="Ej. 7711234567"
                type="text"
                value={formData.emergencyContact.phone}
              />
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
            <Button onClick={handleSaveDraft} type="button" variant="secondary">
              Guardar borrador
            </Button>
            <div>
              <Button onClick={() => navigate("/login")} type="button" variant="secondary">
                Volver
              </Button>
              <Button disabled={isSubmitting} isLoading={isSubmitting} loadingText="Guardando perfil..." type="submit">
                Guardar y continuar
              </Button>
            </div>
          </div>
        </form>
      </div>
    </SetupLayout>
  );
}
