import { useNavigate } from "react-router-dom";
import { Button } from "../../../components/common/Button/Button";
import { SetupLayout, type SetupNavigationKey } from "../../../layouts/SetupLayout/SetupLayout";
import "./SetupPlaceholder.css";

interface SetupPlaceholderProps {
  activeStep: SetupNavigationKey;
  title: string;
}

export function SetupPlaceholder({ activeStep, title }: SetupPlaceholderProps) {
  const navigate = useNavigate();
  const isPlanStep = activeStep === "plan";
  const isConfirmationStep = activeStep === "confirmacion";

  return (
    <SetupLayout activeStep={activeStep}>
      <section className="setup-placeholder" aria-labelledby="setup-placeholder-title">
        <p>Configuración inicial</p>
        <h1 id="setup-placeholder-title">{title}</h1>
        <span>
          {isConfirmationStep
            ? "Tu configuración está casi lista. Este paso se implementará en la siguiente etapa"
            : "Este paso se implementará en la siguiente etapa."}
        </span>
        {isPlanStep || isConfirmationStep ? (
          <div className="setup-placeholder__actions">
            <Button
              onClick={() => navigate(isConfirmationStep ? "/configuracion/plan" : "/configuracion/dispositivos")}
              type="button"
              variant="secondary"
            >
              {isConfirmationStep ? "Volver a Plan y licencia" : "Volver a dispositivos"}
            </Button>
          </div>
        ) : null}
      </section>
    </SetupLayout>
  );
}
