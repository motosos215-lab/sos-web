export type SetupSummaryKey = "cuenta" | "perfil" | "motocicleta" | "contactos" | "dispositivos" | "plan";

export type SetupSummaryStatus = "complete" | "warning" | "incomplete";

export interface SetupSummaryDetail {
  label: string;
  value: string;
}

export interface SetupSummaryModule {
  key: SetupSummaryKey;
  title: string;
  status: SetupSummaryStatus;
  description: string;
  details: SetupSummaryDetail[];
  editPath: string;
  required: boolean;
  blockingMessage?: string;
  warningMessage?: string;
}

export interface SetupCompletionValidation {
  isValid: boolean;
  modules: SetupSummaryModule[];
  blockingIssues: string[];
  warnings: string[];
}

export interface CompleteSetupResponse {
  success: boolean;
  message: string;
  data: {
    setupCompleted: boolean;
    completedAt: string;
    nextRoute: "/dashboard/resumen";
  } | null;
}
