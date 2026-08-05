import { Bike, ShieldCheck, Sparkles, UserRound, Users, UsersRound } from "lucide-react";
import { Button } from "../../../components/common/Button/Button";
import type { PlanId, MotoSosPlan } from "../../../types/plan";
import { PlanFeatureList } from "./PlanFeatureList";
import { PlanStatusBadge } from "./PlanStatusBadge";

interface PlanCardProps {
  disabled?: boolean;
  featuresExpanded?: boolean;
  isCurrentPlan: boolean;
  loading?: boolean;
  onToggleFeatures?: () => void;
  onUpgrade: (plan: MotoSosPlan) => void;
  plan: MotoSosPlan;
}

const planIcons: Record<PlanId, typeof ShieldCheck> = {
  basico: ShieldCheck,
  plus: Sparkles,
  familiar_pro: UsersRound,
};

const limitIcons = [
  { key: "contactLimit", label: "Contactos", Icon: Users },
  { key: "vehicleLimit", label: "Vehículos", Icon: Bike },
  { key: "driverLimit", label: "Conductores", Icon: UserRound },
] as const;

function formatLimit(value: number | null) {
  return value === null ? "Según licencia" : String(value);
}

export function PlanCard({
  disabled = false,
  featuresExpanded = true,
  isCurrentPlan,
  loading = false,
  onToggleFeatures,
  onUpgrade,
  plan,
}: PlanCardProps) {
  const Icon = planIcons[plan.id];
  const isWide = plan.id === "familiar_pro";

  return (
    <article
      aria-label={`${plan.name}${isCurrentPlan ? ", plan activo" : ", disponible para mejorar en la app"}`}
      className={[
        "plan-card",
        `plan-card--theme-${plan.id}`,
        isCurrentPlan ? "plan-card--current" : "",
        isWide ? "plan-card--wide" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="plan-card__header">
        <div className={`plan-card__icon plan-card__icon--${plan.id}`} aria-hidden="true">
          <Icon size={22} />
        </div>
        <div className="plan-card__titles">
          <h2>{plan.name}</h2>
          <p>{plan.description}</p>
        </div>
        <div className="plan-card__badge">
          {isCurrentPlan ? <span className="plan-card__included">Incluido</span> : <PlanStatusBadge status={plan.status} />}
        </div>
      </header>

      <dl className="plan-card__limits" aria-label={`Límites del plan ${plan.name}`}>
        {limitIcons.map(({ key, label, Icon: LimitIcon }) => (
          <div className="plan-card__limit" key={key}>
            <dt>
              <LimitIcon aria-hidden="true" size={15} />
              <span>{label}</span>
            </dt>
            <dd>{formatLimit(plan[key])}</dd>
          </div>
        ))}
      </dl>

      <PlanFeatureList features={plan.features} expanded={featuresExpanded} onToggle={onToggleFeatures} />

      {isCurrentPlan ? (
        <Button disabled type="button" variant="secondary">
          Plan activo
        </Button>
      ) : (
        <Button
          aria-label={`Mejorar al plan ${plan.name} desde la app MotoSOS`}
          disabled={disabled || loading}
          onClick={() => onUpgrade(plan)}
          type="button"
          variant="secondary"
        >
          Mejorar en la app
        </Button>
      )}
    </article>
  );
}
