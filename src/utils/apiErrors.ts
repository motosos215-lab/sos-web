import { AxiosError } from "axios";
import { ApiRequestError } from "../services/api";

function messageForStatus(status: number): string {
  switch (status) {
    case 400:
      return "No se pudo guardar. Revisa los campos marcados y corrige el dato inválido.";
    case 401:
      return "Tu sesión expiró. Inicia sesión nuevamente";
    case 403:
      return "Tu cuenta no tiene permisos para realizar esta acción.";
    case 404:
      return "No encontramos la información solicitada";
    case 409:
      return "Existe un conflicto con la información registrada. Revisa los datos e inténtalo nuevamente.";
    case 429:
      return "Has realizado demasiadas solicitudes. Inténtalo nuevamente más tarde.";
    case 500:
      return "MotoSOS no está disponible temporalmente.";
    case 501:
      return "Esta función no está disponible en el servicio actual";
    case 503:
      return "MotoSOS no está disponible temporalmente.";
    default:
      return "Ocurrió un error inesperado. Inténtalo más tarde";
  }
}

function messageForCode(code: string): string {
  switch (code) {
    case "invalid_credentials":
      return "El correo o la contraseña son incorrectos";
    case "validation_error":
      return "No se pudo guardar. Revisa los campos marcados y corrige el dato inválido.";
    case "user_not_found":
      return "No fue posible iniciar sesión con esta cuenta";
    case "not_found":
      return "No encontramos la información solicitada";
    case "plan_limit_exceeded":
      return "Tu plan actual ya alcanzó el límite permitido";
    case "session-expired":
      return "Tu sesión expiró. Inicia sesión nuevamente";
    case "role_incompatible":
      return "Tu cuenta tiene un rol que todavía no es compatible con esta aplicación";
    case "invalid_response":
      return "Recibimos una respuesta inesperada del servicio";
    case "session_validation_failed":
      return "No fue posible validar la sesión";
    case "missing_config":
      return "La aplicación no tiene configurada la dirección del servicio";
    case "evidence_upload_conflict":
      return "Ya existe una evidencia con ese identificador, pero el archivo no coincide.";
    case "evidence_file_not_available":
      return "El archivo de evidencia no está disponible para descarga.";
    case "location_not_available":
      return "La ubicación de esta emergencia no está disponible.";
    case "emergency_status_not_available":
      return "El estado de esta emergencia no está disponible.";
    default:
      return "";
  }
}

function messageForBackendText(message: string): string {
  const normalized = message.trim().toLowerCase();

  if (normalized.includes("no linked emergency contacts")) {
    return "Aún no tienes contactos vinculados. Acepta una invitación de emergencia para recibir alertas.";
  }

  if (normalized.includes("incidents api is available only for riders")) {
    return "Esta sección solo está disponible para cuentas de conductor.";
  }

  if (normalized.includes("emergency contacts flow is available only for riders")) {
    return "La gestión de contactos desde esta sección solo está disponible para conductores.";
  }

  if (normalized.includes("emergency resolution api is not available for this role")) {
    return "Tu cuenta no tiene permiso para ver la resolución de esta emergencia.";
  }

  if (normalized.includes("notifications api is available only for riders")) {
    return "Las notificaciones de esta sección solo están disponibles para conductores.";
  }

  if (normalized.includes("api is available only for riders") || normalized.includes("available only for riders")) {
    return "Esta sección solo está disponible para cuentas de conductor.";
  }

  return "";
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.code === "validation_error" && error.message.length > 0) {
      return error.message;
    }

    const backendText = messageForBackendText(error.message);

    if (backendText) {
      return backendText;
    }

    if (error.code.startsWith("http_")) {
      const parsed = Number.parseInt(error.code.slice(5), 10);
      return Number.isFinite(parsed) ? messageForStatus(parsed) : "Ocurrió un error inesperado. Inténtalo más tarde";
    }

    const coded = messageForCode(error.code);

    if (coded) {
      return coded;
    }

    if (error.status != null) {
      return messageForStatus(error.status);
    }

    if (error.message.length > 0) {
      return error.message;
    }

    return "Ocurrió un error inesperado. Inténtalo más tarde";
  }

  if (error instanceof AxiosError) {
    if (error.code === "ECONNABORTED") {
      return "No fue posible conectar con MotoSOS. Verifica tu conexión e inténtalo nuevamente";
    }

    if (!error.response) {
      return "No fue posible conectar con MotoSOS. Verifica tu conexión e inténtalo nuevamente";
    }

    const body = error.response.data as { error?: { code?: unknown; message?: unknown }; message?: unknown } | undefined;
    const code = typeof body?.error?.code === "string" ? body.error.code : "";

    if (code.length > 0) {
      const coded = messageForCode(code);

      if (coded) {
        return coded;
      }
    }

    const message = typeof body?.error?.message === "string" ? body.error.message : typeof body?.message === "string" ? body.message : "";

    return message.length > 0 ? messageForBackendText(message) || message : messageForStatus(error.response.status);
  }

  if (error instanceof Error && error.message.length > 0) {
    return messageForBackendText(error.message) || error.message;
  }

  return "Ocurrió un error inesperado. Inténtalo más tarde";
}
