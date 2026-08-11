import { AxiosError } from "axios";
import { ApiRequestError } from "../services/api";

function messageForStatus(status: number): string {
  switch (status) {
    case 400:
      return "Revisa los datos ingresados";
    case 401:
      return "Tu sesión expiró. Inicia sesión nuevamente";
    case 403:
      return "Tu cuenta no tiene permisos para realizar esta acción.";
    case 404:
      return "No fue posible iniciar sesión con esta cuenta";
    case 409:
      return "Existe un conflicto con la información registrada. Revisa los datos e inténtalo nuevamente.";
    case 429:
      return "Has realizado demasiadas solicitudes. Inténtalo nuevamente más tarde.";
    case 500:
      return "MotoSOS no está disponible temporalmente.";
    case 501:
      return "Esta función estará disponible próximamente";
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
      return "Revisa los datos ingresados";
    case "user_not_found":
    case "not_found":
      return "No fue posible iniciar sesión con esta cuenta";
    case "session-expired":
      return "Tu sesión expiró. Inicia sesión nuevamente";
    case "role_incompatible":
      return "Tu cuenta tiene un rol que todavía no es compatible con esta aplicación";
    case "invalid_response":
      return "Recibimos una respuesta inesperada del servicio";
    case "session_validation_failed":
      return "No fue posible validar la sesión";
    default:
      return "";
  }
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.code === "validation_error" && error.message.length > 0) {
      return error.message;
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

    return "Ocurrió un error inesperado. Inténtalo más tarde";
  }

  if (error instanceof AxiosError) {
    if (error.code === "ECONNABORTED") {
      return "No fue posible conectar con MotoSOS. Verifica tu conexión e inténtalo nuevamente";
    }

    if (!error.response) {
      return "No fue posible conectar con MotoSOS. Verifica tu conexión e inténtalo nuevamente";
    }

    return messageForStatus(error.response.status);
  }

  return "Ocurrió un error inesperado. Inténtalo más tarde";
}
