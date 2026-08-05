import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getSetupStepPath } from "../config/setupSteps";
import { getSession } from "../services/sessionService";

export function DashboardRoute() {
  const session = getSession();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session.role === "conductor" && !session.setupCompleted) {
    const setupPath = getSetupStepPath(session.currentSetupStep);

    if (location.pathname !== setupPath) {
      return <Navigate to={setupPath} replace />;
    }
  }

  return <Outlet />;
}
