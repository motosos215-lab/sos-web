import { AuthInitializationGate } from "./components/auth/AuthInitializationGate";
import { AppRoutes } from "./routes/AppRoutes";

export default function App() {
  return (
    <AuthInitializationGate>
      <AppRoutes />
    </AuthInitializationGate>
  );
}