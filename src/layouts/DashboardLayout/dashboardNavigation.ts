import {
  Bell,
  FileChartColumn,
  LayoutDashboard,
  MapPinned,
  Settings,
  Siren,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface DashboardNavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

export const dashboardNavItems: DashboardNavItem[] = [
  { icon: LayoutDashboard, label: "Resumen", path: "/dashboard/resumen" },
  { icon: Siren, label: "Incidentes", path: "/dashboard/incidentes" },
  { icon: MapPinned, label: "Mapa en vivo", path: "/dashboard/mapa" },
  { icon: Users, label: "Contactos", path: "/dashboard/contactos" },
  { icon: FileChartColumn, label: "Reportes", path: "/dashboard/reportes" },
  { icon: Settings, label: "Configuración", path: "/dashboard/configuracion" },
  { icon: Bell, label: "Notificaciones", path: "/dashboard/notificaciones" },
];
