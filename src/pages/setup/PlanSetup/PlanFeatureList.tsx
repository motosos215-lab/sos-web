import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import type { PlanFeature } from "../../../types/plan";

const INITIAL_VISIBLE_FEATURES = 4;

interface PlanFeatureListProps {
  features: PlanFeature[];
  expanded?: boolean;
  onToggle?: () => void;
}

export function PlanFeatureList({ features, expanded = true, onToggle }: PlanFeatureListProps) {
  const isCollapsed = !expanded && features.length > INITIAL_VISIBLE_FEATURES;

  return (
    <div className="plan-feature-block">
      <p className="plan-feature-block__label">Beneficios incluidos</p>
      <ul className={`plan-feature-list ${isCollapsed ? "plan-feature-list--collapsed" : ""}`.trim()} id="plan-features">
        {features.map((feature) => (
          <li key={feature.id}>
            <CheckCircle2 aria-hidden="true" size={16} />
            {feature.label}
          </li>
        ))}
      </ul>
      {onToggle && features.length > INITIAL_VISIBLE_FEATURES ? (
        <button
          aria-controls="plan-features"
          aria-expanded={expanded}
          className="plan-feature-block__toggle"
          onClick={onToggle}
          type="button"
        >
          {expanded ? (
            <>
              Mostrar menos
              <ChevronUp aria-hidden="true" size={16} />
            </>
          ) : (
            <>
              Ver todos los beneficios
              <ChevronDown aria-hidden="true" size={16} />
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}
