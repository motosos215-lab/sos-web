import type { UserRole } from "../services/sessionService";

export type RoleMappingResult =
  | { ok: true; role: UserRole }
  | { ok: false; error: string };

export function mapApiRoleToAppRole(role: string | undefined | null): RoleMappingResult {
  switch (role) {
    case "Rider":
    case "Conductor":
      return { ok: true, role: "conductor" };
    case "Monitor":
      return { ok: true, role: "monitor" };
    case "Administrator":
    case "Admin":
      return { ok: true, role: "administrador" };
    default:
      return {
        ok: false,
        error: "Tu cuenta tiene un rol que todavía no es compatible con esta aplicación",
      };
  }
}
