import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardRoute } from "./DashboardRoute";
import { DashboardRoleRoute } from "./DashboardRoleRoute";
import { ProtectedRoute } from "./ProtectedRoute";
import { RootRedirect } from "./RootRedirect";
import { SetupRoute } from "./SetupRoute";

const Login = lazy(() => import("../pages/auth/Login/Login").then((module) => ({ default: module.Login })));
const Register = lazy(() => import("../pages/auth/Register/Register").then((module) => ({ default: module.Register })));
const VerifyAccount = lazy(() => import("../pages/auth/VerifyAccount/VerifyAccount").then((module) => ({ default: module.VerifyAccount })));
const ForgotPassword = lazy(() =>
  import("../pages/auth/ForgotPassword/ForgotPassword").then((module) => ({ default: module.ForgotPassword })),
);
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword/ResetPassword").then((module) => ({ default: module.ResetPassword })));
const DashboardLayout = lazy(() =>
  import("../layouts/DashboardLayout/DashboardLayout").then((module) => ({ default: module.DashboardLayout })),
);
const DashboardSummaryPage = lazy(() =>
  import("../pages/dashboard/DashboardSummaryPage").then((module) => ({ default: module.DashboardSummaryPage })),
);
const DashboardContactsPage = lazy(() =>
  import("../pages/dashboard/DashboardContactsPage").then((module) => ({ default: module.DashboardContactsPage })),
);
const DashboardMapPage = lazy(() => import("../pages/dashboard/DashboardMapPage").then((module) => ({ default: module.DashboardMapPage })));
const DashboardNotificationsPage = lazy(() =>
  import("../pages/dashboard/DashboardNotificationsPage").then((module) => ({ default: module.DashboardNotificationsPage })),
);
const DashboardReportsPage = lazy(() =>
  import("../pages/dashboard/DashboardReportsPage").then((module) => ({ default: module.DashboardReportsPage })),
);
const DashboardSettingsPage = lazy(() =>
  import("../pages/dashboard/DashboardSettingsPage").then((module) => ({ default: module.DashboardSettingsPage })),
);
const IncidentsPage = lazy(() =>
  import("../pages/dashboard/incidents/IncidentsPage").then((module) => ({ default: module.IncidentsPage })),
);
const IncidentDetailPage = lazy(() =>
  import("../pages/dashboard/incidents/IncidentDetailPage").then((module) => ({ default: module.IncidentDetailPage })),
);
const ProfileSetup = lazy(() => import("../pages/setup/ProfileSetup/ProfileSetup").then((module) => ({ default: module.ProfileSetup })));
const VehicleSetup = lazy(() => import("../pages/setup/VehicleSetup/VehicleSetup").then((module) => ({ default: module.VehicleSetup })));
const ContactSetup = lazy(() => import("../pages/setup/ContactSetup/ContactSetup").then((module) => ({ default: module.ContactSetup })));
const DevicesSetup = lazy(() => import("../pages/setup/DevicesSetup/DevicesSetup").then((module) => ({ default: module.DevicesSetup })));
const PlanSetup = lazy(() => import("../pages/setup/PlanSetup/PlanSetup").then((module) => ({ default: module.PlanSetup })));
const ConfirmationSetup = lazy(() =>
  import("../pages/setup/ConfirmationSetup/ConfirmationSetup").then((module) => ({ default: module.ConfirmationSetup })),
);

export function AppRoutes() {
  return (
    <Suspense fallback={<div aria-live="polite">Cargando...</div>}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Register />} />
        <Route path="/verificar-cuenta" element={<VerifyAccount />} />
        <Route path="/recuperar-contrasena" element={<ForgotPassword />} />
        <Route path="/restablecer-contrasena" element={<ResetPassword />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardRoute />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Navigate to="/dashboard/resumen" replace />} />
              <Route path="resumen" element={<DashboardSummaryPage />} />
              <Route element={<DashboardRoleRoute allowedRoles={["conductor", "administrador"]} />}>
                <Route path="incidentes" element={<IncidentsPage />} />
                <Route path="incidentes/:incidentId" element={<IncidentDetailPage />} />
                <Route path="mapa" element={<DashboardMapPage />} />
                <Route path="contactos" element={<DashboardContactsPage />} />
                <Route path="reportes" element={<DashboardReportsPage />} />
                <Route path="notificaciones" element={<DashboardNotificationsPage />} />
              </Route>
              <Route path="configuracion" element={<DashboardSettingsPage />} />
            </Route>
          </Route>
          <Route element={<SetupRoute />}>
            <Route path="/configuracion" element={<Navigate to="/configuracion/perfil" replace />} />
            <Route path="/configuracion/perfil" element={<ProfileSetup />} />
            <Route path="/configuracion/motocicleta" element={<VehicleSetup />} />
            <Route path="/configuracion/contactos" element={<ContactSetup />} />
            <Route path="/configuracion/dispositivos" element={<DevicesSetup />} />
            <Route path="/configuracion/plan" element={<PlanSetup />} />
            <Route path="/configuracion/confirmacion" element={<ConfirmationSetup />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}
