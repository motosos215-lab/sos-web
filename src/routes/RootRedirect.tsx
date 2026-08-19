import { Navigate } from "react-router-dom";
import { resolveOnboardingRoute } from "../services/onboardingService";
import { getAuthTokens } from "../services/authTokenService";
import { getActiveUserId, getSession } from "../services/sessionService";

export function RootRedirect() {
  const session = getSession();
  const userId = getActiveUserId();
  const hasTokens = userId ? getAuthTokens(userId) !== null : false;

  if (!session || !userId || !hasTokens) {
    return <Navigate to="/login" replace />;
  }

  if (session.role === "conductor" && !session.setupCompleted) {
    return <Navigate to={resolveOnboardingRoute(session.onboardingStatusSnapshot ?? {}, session)} replace />;
  }

  return <Navigate to="/dashboard/resumen" replace />;
}
