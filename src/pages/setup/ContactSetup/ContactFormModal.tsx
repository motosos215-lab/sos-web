import { FormEvent, useEffect, useRef } from "react";
import { Button } from "../../../components/common/Button/Button";
import { Input } from "../../../components/common/Input/Input";
import { Select, type SelectOption } from "../../../components/common/Select/Select";
import type { ContactPermissions, EmergencyContactDraft } from "../../../types/contact";
import { ContactPermissionSwitches } from "./ContactPermissionSwitches";

export type ContactFormErrors = Partial<Record<keyof EmergencyContactDraft | keyof ContactPermissions | "form", string>>;

interface ContactFormModalProps {
  criticalAlertMessage?: string;
  errors: ContactFormErrors;
  isEditing: boolean;
  isSubmitting: boolean;
  onChange: <Field extends keyof EmergencyContactDraft>(field: Field, value: EmergencyContactDraft[Field]) => void;
  onClose: () => void;
  onPermissionChange: (key: keyof ContactPermissions, value: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  values: EmergencyContactDraft;
}

const relationshipOptions: SelectOption[] = [
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

const priorityOptions: SelectOption[] = [
  { label: "Contacto principal", value: "principal" },
  { label: "Contacto secundario", value: "secundario" },
];

const invitationChannelOptions: SelectOption[] = [
  { label: "Correo electrónico", value: "email" },
  { label: "SMS", value: "sms" },
  { label: "Copiar código o enlace", value: "codigo_enlace" },
];

export function ContactFormModal({
  criticalAlertMessage,
  errors,
  isEditing,
  isSubmitting,
  onChange,
  onClose,
  onPermissionChange,
  onSubmit,
  values,
}: ContactFormModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const firstInput = dialog?.querySelector<HTMLElement>("input, select, button");
    firstInput?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialog) {
        return;
      }

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>("button, input, select, textarea, [tabindex]:not([tabindex='-1'])"),
      ).filter((element) => !element.hasAttribute("disabled"));

      if (focusableElements.length === 0) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="contact-modal" role="presentation">
      <div aria-labelledby="contact-form-title" aria-modal="true" className="contact-modal__dialog" ref={dialogRef} role="dialog">
        <header className="contact-modal__header">
          <div>
            <p>Contacto de emergencia</p>
            <h2 id="contact-form-title">{isEditing ? "Editar contacto" : "Agregar contacto de emergencia"}</h2>
          </div>
          <button aria-label="Cerrar formulario de contacto" onClick={onClose} type="button">
            Cerrar
          </button>
        </header>

        <form className="contact-modal__form" noValidate onSubmit={onSubmit}>
          <div className="contact-modal__grid">
            <Input
              data-field="fullName"
              error={errors.fullName}
              id="contactFullName"
              label="Nombre completo"
              maxLength={80}
              name="fullName"
              onChange={(event) => onChange("fullName", event.target.value)}
              placeholder="Ej. María Pérez"
              type="text"
              value={values.fullName}
            />
            <Select
              data-field="relationship"
              error={errors.relationship}
              id="relationship"
              label="Parentesco o relación"
              name="relationship"
              onChange={(event) => onChange("relationship", event.target.value)}
              options={relationshipOptions}
              placeholder="Ej. Madre"
              value={values.relationship}
            />
            {values.relationship === "Otro" ? (
              <Input
                data-field="customRelationship"
                error={errors.customRelationship}
                id="customRelationship"
                label="Especifica la relación"
                maxLength={60}
                name="customRelationship"
                onChange={(event) => onChange("customRelationship", event.target.value)}
                placeholder="Ej. Vecino de confianza"
                type="text"
                value={values.customRelationship}
              />
            ) : null}
            <Input
              data-field="phone"
              error={errors.phone}
              id="contactPhone"
              inputMode="numeric"
              label="Teléfono"
              maxLength={10}
              name="phone"
              onChange={(event) => onChange("phone", event.target.value.replace(/\D/g, "").slice(0, 10))}
              pattern="[0-9]{10}"
              placeholder="Ej. 7711234567"
              type="text"
              value={values.phone}
            />
            <Input
              data-field="email"
              error={errors.email}
              id="contactEmail"
              label="Correo electrónico"
              maxLength={120}
              name="email"
              onChange={(event) => onChange("email", event.target.value)}
              placeholder="ejemplo@correo.com"
              type="email"
              value={values.email}
            />
            <Select
              data-field="priority"
              error={errors.priority}
              id="priority"
              label="Prioridad"
              name="priority"
              onChange={(event) => onChange("priority", event.target.value as EmergencyContactDraft["priority"])}
              options={priorityOptions}
              placeholder="Ej. Contacto principal"
              value={values.priority}
            />
            <Select
              data-field="invitationChannel"
              error={errors.invitationChannel}
              id="invitationChannel"
              label="Canal de invitación"
              name="invitationChannel"
              onChange={(event) => onChange("invitationChannel", event.target.value as EmergencyContactDraft["invitationChannel"])}
              options={invitationChannelOptions}
              placeholder="Ej. Correo electrónico"
              value={values.invitationChannel}
            />
          </div>

          <p className="contact-modal__info">La invitación permitirá que el contacto se vincule desde la app MotoSOS en modo monitor.</p>

          <ContactPermissionSwitches
            criticalAlertMessage={criticalAlertMessage}
            onChange={onPermissionChange}
            permissions={values.permissions}
            priority={values.priority}
          />

          <p className="contact-modal__privacy">
            Los datos y permisos de tus contactos se utilizarán únicamente para gestionar alertas y situaciones de emergencia.
          </p>

          <div className="contact-modal__actions">
            <Button disabled={isSubmitting} onClick={onClose} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button isLoading={isSubmitting} loadingText="Guardando contacto..." type="submit">
              Guardar contacto
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
