import type { ContactPermissions, ContactPriority } from "../../../types/contact";

interface PermissionOption {
  description: string;
  key: keyof ContactPermissions;
  label: string;
}

interface ContactPermissionSwitchesProps {
  criticalAlertMessage?: string;
  onChange: (key: keyof ContactPermissions, value: boolean) => void;
  permissions: ContactPermissions;
  priority: ContactPriority | "";
}

const permissionOptions: PermissionOption[] = [
  {
    key: "realTimeLocation",
    label: "Ubicación en tiempo real",
    description: "Permite consultar la ubicación durante un incidente o viaje autorizado.",
  },
  {
    key: "criticalAlerts",
    label: "Alertas críticas",
    description: "Recibe notificaciones de accidentes y solicitudes SOS.",
  },
  {
    key: "minorIncidents",
    label: "Incidentes menores",
    description: "Recibe información sobre eventos de riesgo no críticos.",
  },
  {
    key: "vitalSigns",
    label: "Signos vitales",
    description: "Permite visualizar información disponible del smartwatch cuando exista autorización.",
  },
];

export function ContactPermissionSwitches({
  criticalAlertMessage,
  onChange,
  permissions,
  priority,
}: ContactPermissionSwitchesProps) {
  return (
    <fieldset className="contact-permissions">
      <legend>Permisos</legend>
      <div className="contact-permissions__list">
        {permissionOptions.map((option) => {
          const isCriticalLocked = option.key === "criticalAlerts" && priority === "principal";
          const descriptionId = `${option.key}-description`;

          return (
            <label className="contact-permissions__item" key={option.key}>
              <span>
                <strong>{option.label}</strong>
                <small id={descriptionId}>{option.description}</small>
              </span>
              <input
                aria-describedby={descriptionId}
                checked={permissions[option.key]}
                data-field={option.key}
                onChange={(event) => onChange(option.key, isCriticalLocked ? true : event.target.checked)}
                role="switch"
                type="checkbox"
              />
              <span className="contact-permissions__state" aria-hidden="true">
                {permissions[option.key] ? "Activo" : "Inactivo"}
              </span>
            </label>
          );
        })}
      </div>
      {criticalAlertMessage ? (
        <p className="contact-permissions__message" role="status">
          {criticalAlertMessage}
        </p>
      ) : null}
      <p className="contact-permissions__privacy">
        Solo se compartirán los datos autorizados y necesarios durante la atención de una emergencia.
      </p>
    </fieldset>
  );
}
