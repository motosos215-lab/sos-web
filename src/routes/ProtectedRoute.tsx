import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getAuthTokens } from "../services/authTokenService";
import { getActiveUserId, getSession } from "../services/sessionService";

export function ProtectedRoute() {
  const location = useLocation();
  const session = getSession();
  const userId = getActiveUserId();

  if (!session || !userId || !getAuthTokens(userId)) {
    return <Navigate to="/login" replace state={{ redirectTo: `${location.pathname}${location.search}` }} />;
  }

  return <Outlet />;
}
