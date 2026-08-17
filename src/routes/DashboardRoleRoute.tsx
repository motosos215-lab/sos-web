import { Navigate, Outlet } from "react-router-dom";
import { getSession, type UserRole } from "../services/sessionService";

interface DashboardRoleRouteProps {
  allowedRoles: UserRole[];
}

export function DashboardRoleRoute({ allowedRoles }: DashboardRoleRouteProps) {
  const session = getSession();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(session.role)) {
    return <Navigate to="/dashboard/resumen" replace />;
  }

  return <Outlet />;
}
