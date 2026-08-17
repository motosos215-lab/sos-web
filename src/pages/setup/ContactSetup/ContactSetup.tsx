import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertMessage } from "../../../components/common/AlertMessage/AlertMessage";
import { Button } from "../../../components/common/Button/Button";
import { SetupLayout } from "../../../layouts/SetupLayout/SetupLayout";
import { clearEmergencyContactDraft, getEmergencyContactDraft, saveEmergencyContactDraft } from "../../../services/contactDraftService";
import {
  checkContactAvailability,
  deleteEmergencyContact,
  resendContactInvitation,
  revokeContactInvitation,
  saveEmergencyContact,
  sendContactInvitation,
  syncEmergencyContacts,
  updateEmergencyContact,
} from "../../../services/contactService";
import { getStoredEmergencyContacts, upsertStoredEmergencyContact } from "../../../services/contactStorageService";
import { getSession, updateSession } from "../../../services/sessionService";
import type { ContactPermissions, EmergencyContact, EmergencyContactDraft, EmergencyContactFormData } from "../../../types/contact";
import { getApiErrorMessage } from "../../../utils/apiErrors";
import { copyTextToClipboard } from "../../../utils/clipboard";
import { ConfirmActionModal } from "./ConfirmActionModal";
import { ContactFormModal, type ContactFormErrors } from "./ContactFormModal";
import { ContactList } from "./ContactList";
import { InvitationPanel } from "./InvitationPanel";
import "./ContactSetup.css";

type ConfirmAction = { contact: EmergencyContact; type: "delete" } | { contact: EmergencyContact; type: "revoke" };

const defaultPermissions: ContactPermissions = {
  realTimeLocation: true,
  criticalAlerts: true,
  minorIncidents: false,
  vitalSigns: false,
};

const initialFormData: EmergencyContactDraft = {
  fullName: "",
  relationship: "",
  customRelationship: "",
  phone: "",
  email: "",
  priority: "principal",
  invitationChannel: "",
  permissions: defaultPermissions,
};

const knownRelationships = [
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
];

const fieldOrder: Array<keyof ContactFormErrors> = [
  "fullName",
  "relationship",
  "customRelationship",
  "phone",
  "email",
  "priority",
  "invitationChannel",
];

function normalizePhoneDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

function normalizeNationalPhone(phone: string) {
  return normalizePhoneDigits(phone).slice(0, 10);
}

function sanitizeFormData(data: EmergencyContactDraft): EmergencyContactDraft {
  return {
    ...data,
    fullName: data.fullName.trim().replace(/\s+/g, " "),
    relationship: data.relationship,
    customRelationship: data.customRelationship.trim().replace(/\s+/g, " "),
    phone: normalizeNationalPhone(data.phone),
    email: data.email.trim().toLowerCase(),
    priority: data.priority || "principal",
    permissions: {
      ...data.permissions,
      criticalAlerts: data.priority === "principal" ? true : data.permissions.criticalAlerts,
    },
  };
}

function toContactFormData(data: EmergencyContactDraft): EmergencyContactFormData {
  return {
    fullName: data.fullName,
    relationship: data.relationship === "Otro" ? data.customRelationship : data.relationship,
    phone: data.phone,
    email: data.email,
    priority: data.priority,
    invitationChannel: data.invitationChannel,
    permissions: data.permissions,
  };
}

function getDraftFromContact(contact: EmergencyContact): EmergencyContactDraft {
  const usesKnownRelationship = knownRelationships.includes(contact.relationship);

  return {
    fullName: contact.fullName,
    relationship: usesKnownRelationship ? contact.relationship : "Otro",
    customRelationship: usesKnownRelationship ? "" : contact.relationship,
    phone: contact.phone,
    email: contact.email,
    priority: contact.priority,
    invitationChannel: contact.invitationChannel,
    permissions: contact.permissions,
  };
}

function validateContact(data: EmergencyContactDraft): ContactFormErrors {
  const errors: ContactFormErrors = {};
  const phoneDigits = normalizePhoneDigits(data.phone);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (data.fullName.length < 3 || data.fullName.length > 80) {
    errors.fullName = "Ingresa el nombre completo del contacto";
  }

  if (!data.relationship) {
    errors.relationship = "Selecciona el parentesco o relación";
  }

  if (data.relationship === "Otro" && data.customRelationship.length < 2) {
    errors.customRelationship = "Especifica la relación";
  }

  if (!/^\d{10}$/.test(phoneDigits) || /^0+$/.test(phoneDigits)) {
    errors.phone = "Ingresa un teléfono de 10 dígitos sin lada";
  }

  if (!emailPattern.test(data.email) || data.email.length > 120) {
    errors.email = "Ingresa un correo electrónico válido";
  }

  if (!data.priority) {
    errors.priority = "Selecciona la prioridad del contacto";
  }

  if (!data.invitationChannel) {
    errors.invitationChannel = "Selecciona el canal de invitación";
  }

  return errors;
}

function focusFirstContactError(errors: ContactFormErrors) {
  const firstError = fieldOrder.find((field) => Boolean(errors[field]));

  if (!firstError) {
    return;
  }

  window.setTimeout(() => {
    const element = document.querySelector<HTMLElement>(`[data-field="${firstError}"]`);
    element?.focus();
    element?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, 0);
}

function getInvitationChannelMessage(contact: EmergencyContact) {
  if (contact.invitationChannel === "email") {
    return "La invitación quedó lista para enviarse por correo electrónico";
  }

  if (contact.invitationChannel === "sms") {
    return "La invitación quedó lista para enviarse por SMS";
  }

  return "El código y enlace están listos para compartirse";
}

function updateExpiredInvitations(contacts: EmergencyContact[]) {
  let changed = false;
  const now = Date.now();
  const nextContacts = contacts.map((contact) => {
    if (contact.invitationStatus === "invited" && contact.invitationExpiresAt && new Date(contact.invitationExpiresAt).getTime() <= now) {
      changed = true;
      return {
        ...contact,
        invitationStatus: "expired" as const,
        invitationCode: null,
        invitationLink: null,
        invitationExpiresAt: null,
      };
    }

    return contact;
  });

  return { changed, contacts: nextContacts };
}

export function ContactSetup() {
  const navigate = useNavigate();
  const session = getSession();
  const contactLimit = session?.contactLimit ?? 1;
  const [contacts, setContacts] = useState<EmergencyContact[]>(() => updateExpiredInvitations(getStoredEmergencyContacts()).contacts);
  const [formData, setFormData] = useState<EmergencyContactDraft>(initialFormData);
  const [formErrors, setFormErrors] = useState<ContactFormErrors>({});
  const [criticalAlertMessage, setCriticalAlertMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [isSendingInvitation, setIsSendingInvitation] = useState(false);
  const [isResendingInvitation, setIsResendingInvitation] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const primaryContact = contacts[0] ?? null;
  const activeInvitationContact = contacts.find((contact) => contact.invitationStatus === "invited") ?? primaryContact;
  const hasActiveInvitation = Boolean(
    activeInvitationContact?.invitationCode &&
    activeInvitationContact.invitationLink &&
    activeInvitationContact.invitationStatus === "invited",
  );
  const isPlanLimitReached = contacts.length >= contactLimit;

  useEffect(() => {
    const draft = getEmergencyContactDraft();

    if (!draft) {
      return;
    }

    setFormData(draft);
    setInfoMessage("Se recuperó tu borrador anterior");
  }, []);

  useEffect(() => {
    const storedContacts = getStoredEmergencyContacts();
    const result = updateExpiredInvitations(storedContacts);

    if (result.changed) {
      result.contacts.forEach(upsertStoredEmergencyContact);
      setContacts(result.contacts);
    }

    const syncContacts = async () => {
      try {
        await syncEmergencyContacts();
        setContacts(getStoredEmergencyContacts());
      } catch (error) {
        setWarningMessage(getApiErrorMessage(error));
      }
    };

    void syncContacts();
  }, []);

  const refreshContacts = () => setContacts(getStoredEmergencyContacts());

  const clearMessages = () => {
    setSuccessMessage("");
    setWarningMessage("");
    setErrorMessage("");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingContactId(null);
    setFormErrors({});
    window.setTimeout(() => document.getElementById("addEmergencyContact")?.focus(), 0);
  };

  const openAddContact = () => {
    if (isPlanLimitReached) {
      setWarningMessage("Tu plan Básico permite registrar un contacto de emergencia");
      return;
    }

    clearMessages();
    setEditingContactId(null);
    setFormData(initialFormData);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditContact = (contact: EmergencyContact) => {
    clearMessages();
    setEditingContactId(contact.id);
    setFormData(getDraftFromContact(contact));
    setFormErrors({});
    setIsModalOpen(true);
  };

  const updateField = <Field extends keyof EmergencyContactDraft>(field: Field, value: EmergencyContactDraft[Field]) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
      permissions: field === "priority" && value === "principal" ? { ...current.permissions, criticalAlerts: true } : current.permissions,
    }));
    setFormErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
    if (field === "priority" && value === "principal") {
      setCriticalAlertMessage("");
    }
  };

  const updatePermission = (key: keyof ContactPermissions, value: boolean) => {
    if (key === "criticalAlerts" && formData.priority === "principal" && !value) {
      setCriticalAlertMessage("El contacto principal debe recibir alertas críticas");
      setFormData((current) => ({
        ...current,
        permissions: { ...current.permissions, criticalAlerts: true },
      }));
      return;
    }

    setCriticalAlertMessage("");
    setFormData((current) => ({
      ...current,
      permissions: { ...current.permissions, [key]: value },
    }));
  };

  const handleSaveDraft = () => {
    saveEmergencyContactDraft(sanitizeFormData(formData));
    setSuccessMessage("Borrador del contacto guardado correctamente");
    setInfoMessage("");
  };

  const handleSubmitContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSavingContact) {
      return;
    }

    clearMessages();
    const sanitizedData = sanitizeFormData(formData);
    setFormData(sanitizedData);
    const nextErrors = validateContact(sanitizedData);
    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstContactError(nextErrors);
      return;
    }

    if (!editingContactId && isPlanLimitReached) {
      setWarningMessage("Tu plan Básico permite registrar un contacto de emergencia");
      return;
    }

    const contactData = toContactFormData(sanitizedData);
    setIsSavingContact(true);

    try {
      const availability = await checkContactAvailability({ email: contactData.email, phone: contactData.phone });

      if (!availability.success && availability.duplicateField) {
        const duplicateErrors: ContactFormErrors = { [availability.duplicateField]: availability.message };
        setFormErrors(duplicateErrors);
        focusFirstContactError(duplicateErrors);
        return;
      }

      if (editingContactId) {
        const response = await updateEmergencyContact(editingContactId, contactData);

        if (!response.success || !response.data) {
          setErrorMessage(response.message);
          return;
        }

        refreshContacts();
        clearEmergencyContactDraft();
        closeModal();
        setSuccessMessage(response.message);
        return;
      }

      const response = await saveEmergencyContact(contactData);

      if (!response.success || !response.data) {
        setErrorMessage("No pudimos guardar el contacto. Inténtalo nuevamente.");
        return;
      }

      const contact: EmergencyContact = {
        ...contactData,
        id: response.data.contactId,
        invitationStatus: response.data.invitationStatus,
        invitationCode: null,
        invitationLink: null,
        invitationExpiresAt: null,
        createdAt: new Date().toISOString(),
      };

      upsertStoredEmergencyContact(contact);
      refreshContacts();
      clearEmergencyContactDraft();
      closeModal();
      setSuccessMessage(response.message);
    } catch {
      setErrorMessage("No pudimos guardar el contacto. Inténtalo nuevamente.");
    } finally {
      setIsSavingContact(false);
    }
  };

  const applyInvitation = (
    contact: EmergencyContact,
    invitation: NonNullable<Awaited<ReturnType<typeof sendContactInvitation>>["data"]>,
  ) => {
    const nextContact: EmergencyContact = {
      ...contact,
      invitationStatus: invitation.invitationStatus,
      invitationCode: invitation.invitationCode,
      invitationLink: invitation.invitationLink,
      invitationExpiresAt: invitation.expiresAt,
    };

    upsertStoredEmergencyContact(nextContact);
    refreshContacts();
    setSuccessMessage("Invitación generada correctamente");
    setInfoMessage(getInvitationChannelMessage(nextContact));
  };

  const handleSendInvitation = async (contact = primaryContact) => {
    if (!contact) {
      setWarningMessage("Primero guarda un contacto de emergencia");
      return;
    }

    if (contact.invitationStatus !== "pending") {
      setWarningMessage("La invitación solo puede generarse para contactos pendientes");
      return;
    }

    clearMessages();
    setIsSendingInvitation(true);

    try {
      const response = await sendContactInvitation(contact);

      if (!response.success || !response.data) {
        setErrorMessage("No pudimos generar la invitación. Inténtalo nuevamente.");
        return;
      }

      applyInvitation(contact, response.data);
    } catch {
      setErrorMessage("No pudimos generar la invitación. Inténtalo nuevamente.");
    } finally {
      setIsSendingInvitation(false);
    }
  };

  const handleResendInvitation = async (contact = activeInvitationContact) => {
    if (!contact || !["invited", "expired"].includes(contact.invitationStatus)) {
      return;
    }

    clearMessages();
    setIsResendingInvitation(true);

    try {
      const response = await resendContactInvitation(contact.id);

      if (!response.success || !response.data) {
        setErrorMessage("No pudimos reenviar la invitación. Inténtalo nuevamente.");
        return;
      }

      applyInvitation(contact, response.data);
    } catch {
      setErrorMessage("No pudimos reenviar la invitación. Inténtalo nuevamente.");
    } finally {
      setIsResendingInvitation(false);
    }
  };

  const handleCopyCode = async (contact = activeInvitationContact) => {
    if (!contact?.invitationCode || contact.invitationStatus !== "invited") {
      setWarningMessage("Primero genera una invitación para crear el código");
      return;
    }

    const didCopy = await copyTextToClipboard(contact.invitationCode);
    setSuccessMessage(didCopy ? "Código de vinculación copiado" : "No pudimos copiar el código automáticamente");
  };

  const handleCopyLink = async (contact = activeInvitationContact) => {
    if (!contact?.invitationLink || contact.invitationStatus !== "invited") {
      setWarningMessage("Primero genera una invitación para crear el enlace");
      return;
    }

    const didCopy = await copyTextToClipboard(contact.invitationLink);
    setSuccessMessage(didCopy ? "Enlace de invitación copiado" : "No pudimos copiar el enlace automáticamente");
  };

  const handleExpireInvitation = () => {
    if (!activeInvitationContact || activeInvitationContact.invitationStatus !== "invited") {
      return;
    }

    const nextContact: EmergencyContact = {
      ...activeInvitationContact,
      invitationStatus: "expired",
      invitationCode: null,
      invitationLink: null,
      invitationExpiresAt: null,
    };

    upsertStoredEmergencyContact(nextContact);
    refreshContacts();
    setWarningMessage("La invitación ha expirado");
  };

  const confirmSelectedAction = async () => {
    if (!confirmAction) {
      return;
    }

    setIsProcessingAction(true);
    clearMessages();

    try {
      if (confirmAction.type === "revoke") {
        const response = await revokeContactInvitation(confirmAction.contact.id);
        if (!response.success) {
          setErrorMessage(response.message);
          return;
        }
        refreshContacts();
        setSuccessMessage(response.message);
      } else {
        const response = await deleteEmergencyContact(confirmAction.contact.id);
        if (!response.success) {
          setErrorMessage(response.message);
          return;
        }
        refreshContacts();
        updateSession({ emergencyContactConfigured: false, emergencyContactId: null });
        setSuccessMessage(response.message);
      }
    } finally {
      setIsProcessingAction(false);
      setConfirmAction(null);
    }
  };

  const handleContinue = () => {
    if (!primaryContact) {
      setErrorMessage("Agrega un contacto de emergencia antes de continuar");
      return;
    }

    if (primaryContact.invitationStatus === "pending") {
      setWarningMessage("Envía la invitación antes de continuar");
      return;
    }

    if (!["invited", "linked"].includes(primaryContact.invitationStatus)) {
      setWarningMessage("Reenvía una invitación vigente antes de continuar");
      return;
    }

    if (primaryContact.invitationStatus === "invited") {
      setWarningMessage("El contacto aún debe aceptar la invitación desde la app MotoSOS antes de que puedas iniciar viajes monitoreados");
    }

    updateSession({
      currentSetupStep: "dispositivos",
      emergencyContactConfigured: true,
      emergencyContactId: primaryContact.id,
    });
    window.setTimeout(() => navigate("/configuracion/dispositivos"), primaryContact.invitationStatus === "invited" ? 700 : 0);
  };

  return (
    <SetupLayout activeStep="contactos">
      <div className="contact-setup">
        <header className="contact-setup__header">
          <p>Configuración inicial</p>
          <h1>Contactos de emergencia</h1>
          <span>Estas personas serán notificadas y podrán ayudarte en caso de una emergencia.</span>
        </header>

        <section className="contact-setup__toolbar" aria-label="Acciones de contactos">
          <div>
            <Button id="addEmergencyContact" onClick={openAddContact} type="button">
              Agregar contacto
            </Button>
            <Button
              isLoading={isSendingInvitation}
              loadingText="Generando invitación..."
              onClick={() => handleSendInvitation()}
              title={!primaryContact ? "Primero guarda un contacto" : "La invitación solo puede enviarse si el contacto está pendiente"}
              type="button"
              variant="secondary"
            >
              Enviar invitación
            </Button>
            <Button
              onClick={() => handleCopyLink()}
              title="Primero genera una invitación para crear el enlace o código"
              type="button"
              variant="secondary"
            >
              Copiar enlace o código
            </Button>
          </div>
          <p>
            Tu plan Básico permite registrar un contacto de emergencia. <Link to="/configuracion/plan">Ver planes y beneficios</Link>
          </p>
        </section>

        <div className="contact-setup__messages" aria-live="polite">
          {errorMessage ? <AlertMessage variant="error">{errorMessage}</AlertMessage> : null}
          {warningMessage ? <AlertMessage variant="warning">{warningMessage}</AlertMessage> : null}
          {infoMessage ? <AlertMessage variant="info">{infoMessage}</AlertMessage> : null}
          {successMessage ? <AlertMessage variant="success">{successMessage}</AlertMessage> : null}
        </div>

        <div className="contact-setup__content">
          <div className="contact-setup__main-card">
            <ContactList
              contacts={contacts}
              onCopy={handleCopyCode}
              onDelete={(contact) => setConfirmAction({ contact, type: "delete" })}
              onEdit={openEditContact}
              onResend={handleResendInvitation}
              onRevoke={(contact) => setConfirmAction({ contact, type: "revoke" })}
              onSend={handleSendInvitation}
            />
          </div>

          <InvitationPanel
            contact={activeInvitationContact}
            isCopyDisabled={!hasActiveInvitation}
            isResending={isResendingInvitation}
            onCopyCode={() => handleCopyCode()}
            onCopyLink={() => handleCopyLink()}
            onExpire={handleExpireInvitation}
            onResend={() => handleResendInvitation()}
          />
        </div>

        <section className="contact-setup__actions" aria-label="Navegación de configuración">
          <Button onClick={handleSaveDraft} type="button" variant="secondary">
            Guardar borrador
          </Button>
          <div>
            <Button onClick={() => navigate("/configuracion/motocicleta")} type="button" variant="secondary">
              Anterior
            </Button>
            <Button onClick={handleContinue} type="button">
              Siguiente
            </Button>
          </div>
        </section>

        {isModalOpen ? (
          <ContactFormModal
            criticalAlertMessage={criticalAlertMessage}
            errors={formErrors}
            isEditing={Boolean(editingContactId)}
            isSubmitting={isSavingContact}
            onChange={updateField}
            onClose={closeModal}
            onPermissionChange={updatePermission}
            onSubmit={handleSubmitContact}
            values={formData}
          />
        ) : null}

        {confirmAction ? (
          <ConfirmActionModal
            confirmLabel={confirmAction.type === "revoke" ? "Revocar acceso" : "Eliminar contacto"}
            isProcessing={isProcessingAction}
            message={
              confirmAction.type === "revoke"
                ? "Se invalidará la invitación y el contacto perderá el acceso."
                : "El contacto se eliminará y podrás registrar uno nuevo."
            }
            onCancel={() => setConfirmAction(null)}
            onConfirm={confirmSelectedAction}
            title={confirmAction.type === "revoke" ? "¿Revocar acceso?" : "¿Eliminar contacto?"}
          />
        ) : null}
      </div>
    </SetupLayout>
  );
}
