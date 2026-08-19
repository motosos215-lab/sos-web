import type { UserRole } from "../../services/sessionService";

export function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "MS"
  );
}

export function getRoleLabel(role: UserRole) {
  const labels: Record<UserRole, string> = {
    conductor: "Conductor",
    monitor: "Contacto autorizado",
    administrador: "Administrador",
  };

  return labels[role];
}
