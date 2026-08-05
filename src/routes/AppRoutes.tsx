import { Navigate, Route, Routes } from "react-router-dom";
import { ForgotPassword } from "../pages/auth/ForgotPassword/ForgotPassword";
import { Login } from "../pages/auth/Login/Login";
import { Register } from "../pages/auth/Register/Register";
import { ResetPassword } from "../pages/auth/ResetPassword/ResetPassword";
import { VerifyAccount } from "../pages/auth/VerifyAccount/VerifyAccount";
import { DashboardLayout } from "../layouts/DashboardLayout/DashboardLayout";
import { DashboardSummaryPage } from "../pages/dashboard/DashboardSummaryPage";
import { IncidentDetailPage } from "../pages/dashboard/incidents/IncidentDetailPage";
import { IncidentsPage } from "../pages/dashboard/incidents/IncidentsPage";
import { TemporaryDashboardPage } from "../pages/dashboard/TemporaryDashboardPage";
import { ContactSetup } from "../pages/setup/ContactSetup/ContactSetup";
import { ConfirmationSetup } from "../pages/setup/ConfirmationSetup/ConfirmationSetup";
import { DevicesSetup } from "../pages/setup/DevicesSetup/DevicesSetup";
import { PlanSetup } from "../pages/setup/PlanSetup/PlanSetup";
import { ProfileSetup } from "../pages/setup/ProfileSetup/ProfileSetup";
import { VehicleSetup } from "../pages/setup/VehicleSetup/VehicleSetup";
import { DashboardRoute } from "./DashboardRoute";
import { ProtectedRoute } from "./ProtectedRoute";
import { RootRedirect } from "./RootRedirect";
import { SetupRoute } from "./SetupRoute";

export function AppRoutes() {
  return (
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
            <Route path="incidentes" element={<IncidentsPage />} />
            <Route path="incidentes/:incidentId" element={<IncidentDetailPage />} />
            <Route
              path="mapa"
              element={<TemporaryDashboardPage title="Mapa en vivo" message="El mapa operativo se conectará posteriormente con los servicios de ubicación" />}
            />
            <Route
              path="contactos"
              element={<TemporaryDashboardPage title="Contactos y configuración" message="La gestión desde dashboard se implementará en la siguiente etapa" />}
            />
            <Route
              path="reportes"
              element={<TemporaryDashboardPage title="Reportes e historial" message="Los reportes completos se implementarán en una etapa posterior" />}
            />
            <Route
              path="configuracion"
              element={<TemporaryDashboardPage title="Configuración" message="La configuración del dashboard se implementará en la siguiente etapa" />}
            />
            <Route
              path="notificaciones"
              element={<TemporaryDashboardPage title="Notificaciones" message="Las notificaciones reales se implementarán posteriormente" />}
            />
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
  );
}
