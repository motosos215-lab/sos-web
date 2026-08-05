import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getSetupStepByPath, getSetupStepIndex, getSetupStepPath } from "../config/setupSteps";
import { getSession } from "../services/sessionService";

export function SetupRoute() {
  const session = getSession();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session.role !== "conductor") {
    return <Navigate to="/dashboard" replace />;
  }

  if (session.setupCompleted) {
    return <Navigate to="/dashboard/resumen" replace />;
  }

  const requestedStep = getSetupStepByPath(location.pathname);

  if (requestedStep?.key === "confirmacion" && !session.planConfigured) {
    return <Navigate to="/configuracion/plan" replace />;
  }

  if (requestedStep && requestedStep.key !== "cuenta") {
    const requestedIndex = getSetupStepIndex(requestedStep.key);
    const currentIndex = getSetupStepIndex(session.currentSetupStep);

    if (requestedIndex > currentIndex) {
      const currentPath = getSetupStepPath(session.currentSetupStep);

      if (location.pathname !== currentPath) {
        return <Navigate to={currentPath} replace />;
      }
    }
  }

  return <Outlet />;
}
