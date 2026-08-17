import { describe, expect, it } from "vitest";
import { ApiRequestError } from "../services/api";
import { getApiErrorMessage } from "./apiErrors";

describe("getApiErrorMessage", () => {
  it("maps invalid credentials to a safe user-facing message", () => {
    expect(getApiErrorMessage(new ApiRequestError("invalid_credentials", "raw", 401))).toBe("El correo o la contraseña son incorrectos");
  });

  it("preserves backend validation messages", () => {
    expect(getApiErrorMessage(new ApiRequestError("validation_error", "Campo requerido", 400))).toBe("Campo requerido");
  });

  it("maps plan limit conflicts", () => {
    expect(getApiErrorMessage(new ApiRequestError("plan_limit_exceeded", "raw", 409))).toBe(
      "Tu plan actual ya alcanzó el límite permitido",
    );
  });

  it("falls back to HTTP status messages", () => {
    expect(getApiErrorMessage(new ApiRequestError("unknown", "raw", 403))).toBe("Tu cuenta no tiene permisos para realizar esta acción.");
  });

  it("maps backend role errors to Spanish user-facing messages", () => {
    expect(getApiErrorMessage(new ApiRequestError("forbidden", "Incidents API is available only for riders.", 403))).toBe(
      "Esta sección solo está disponible para cuentas de conductor.",
    );
    expect(getApiErrorMessage(new ApiRequestError("forbidden", "Notifications API is available only for riders.", 403))).toBe(
      "Las notificaciones de esta sección solo están disponibles para conductores.",
    );
  });

  it("maps missing monitor links to a safe Spanish message", () => {
    expect(getApiErrorMessage(new ApiRequestError("not_found", "No linked emergency contacts were found.", 404))).toBe(
      "Aún no tienes contactos vinculados. Acepta una invitación de emergencia para recibir alertas.",
    );
  });
});
