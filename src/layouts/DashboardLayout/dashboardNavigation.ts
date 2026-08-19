import { Bell, FileChartColumn, LayoutDashboard, MapPinned, Settings, Siren, Users, type LucideIcon } from "lucide-react";
import type { UserRole } from "../../services/sessionService";

export interface DashboardNavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  roles?: UserRole[];
}

export const dashboardNavItems: DashboardNavItem[] = [
  { icon: LayoutDashboard, label: "Resumen", path: "/dashboard/resumen" },
  { icon: Siren, label: "Incidentes", path: "/dashboard/incidentes", roles: ["conductor"] },
  { icon: MapPinned, label: "Mapa en vivo", path: "/dashboard/mapa", roles: ["conductor"] },
  { icon: Users, label: "Contactos", path: "/dashboard/contactos", roles: ["conductor"] },
  { icon: FileChartColumn, label: "Reportes", path: "/dashboard/reportes", roles: ["conductor"] },
  { icon: Settings, label: "Configuración", path: "/dashboard/configuracion" },
  { icon: Bell, label: "Notificaciones", path: "/dashboard/notificaciones", roles: ["conductor"] },
];

export function getDashboardNavItems(role: UserRole): DashboardNavItem[] {
  return dashboardNavItems.filter((item) => !item.roles || item.roles.includes(role));
}
