import type { SetupStepKey } from "../services/sessionService";

export type SetupNavigationKey = "cuenta" | SetupStepKey;
export type SetupStepStatus = "completed" | "current" | "pending";

export interface SetupStepConfig {
  id: number;
  key: SetupNavigationKey;
  label: string;
  shortLabel: string;
  path: string;
}

export interface SetupStep extends SetupStepConfig {
  status: SetupStepStatus;
}

export const setupStepConfig: SetupStepConfig[] = [
  { id: 1, key: "cuenta", label: "Cuenta", shortLabel: "Cuenta", path: "/login" },
  { id: 2, key: "perfil", label: "Perfil", shortLabel: "Perfil", path: "/configuracion/perfil" },
  {
    id: 3,
    key: "motocicleta",
    label: "Motocicleta / Motoneta",
    shortLabel: "Moto",
    path: "/configuracion/motocicleta",
  },
  {
    id: 4,
    key: "contactos",
    label: "Contactos de emergencia",
    shortLabel: "Contactos",
    path: "/configuracion/contactos",
  },
  {
    id: 5,
    key: "dispositivos",
    label: "Vinculación de dispositivos",
    shortLabel: "Dispositivos",
    path: "/configuracion/dispositivos",
  },
  { id: 6, key: "plan", label: "Plan y licencia", shortLabel: "Plan", path: "/configuracion/plan" },
  {
    id: 7,
    key: "confirmacion",
    label: "Confirmación",
    shortLabel: "Confirmación",
    path: "/configuracion/confirmacion",
  },
];

export function getSetupSteps(activeStep: SetupNavigationKey, allCompleted = false): SetupStep[] {
  const activeIndex = setupStepConfig.findIndex((step) => step.key === activeStep);

  if (allCompleted) {
    return setupStepConfig.map((step) => ({ ...step, status: "completed" as const }));
  }

  return setupStepConfig.map((step, index) => ({
    ...step,
    status: index < activeIndex ? "completed" : index === activeIndex ? "current" : "pending",
  }));
}

export function getSetupStepByPath(pathname: string): SetupStepConfig | null {
  return setupStepConfig.find((step) => step.path === pathname) ?? null;
}

export function getSetupStepPath(stepKey: SetupStepKey): string {
  if (stepKey === "completed") {
    return "/dashboard/resumen";
  }

  return setupStepConfig.find((step) => step.key === stepKey)?.path ?? "/configuracion/perfil";
}

export function getSetupStepIndex(stepKey: SetupNavigationKey): number {
  return setupStepConfig.findIndex((step) => step.key === stepKey);
}
