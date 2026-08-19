import { Navigate, Outlet, useLocation } from "react-router-dom";
import { resolveOnboardingRoute } from "../services/onboardingService";
import { getSession } from "../services/sessionService";

export function DashboardRoute() {
  const session = getSession();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session.role === "conductor" && !session.setupCompleted) {
    const setupPath = resolveOnboardingRoute(session.onboardingStatusSnapshot ?? {}, session);

    if (location.pathname !== setupPath) {
      return <Navigate to={setupPath} replace />;
    }
  }

  return <Outlet />;
}
