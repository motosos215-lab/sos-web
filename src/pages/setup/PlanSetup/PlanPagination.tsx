import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PlanId, MotoSosPlan } from "../../../types/plan";
import { PlanCard } from "./PlanCard";
import { PlanQuickComparison } from "./PlanQuickComparison";

interface PlanPaginationProps {
  plans: MotoSosPlan[];
  currentPlanId: PlanId;
  onUpgrade: (plan: MotoSosPlan) => void;
  upgradeLoadingPlanId?: PlanId | null;
}

const planNames: Record<PlanId, string> = {
  basico: "Básico",
  plus: "Plus",
  familiar_pro: "Familiar / Pro",
};

function getInitialPage(plans: MotoSosPlan[], currentPlanId: PlanId) {
  const index = plans.findIndex((plan) => plan.id === currentPlanId);
  return index >= 0 ? index : 0;
}

export function PlanPagination({ plans, currentPlanId, onUpgrade, upgradeLoadingPlanId = null }: PlanPaginationProps) {
  const [pageIndex, setPageIndex] = useState(() => getInitialPage(plans, currentPlanId));
  const [featuresExpanded, setFeaturesExpanded] = useState(true);

  if (plans.length === 0) {
    return null;
  }

  const safeIndex = Math.min(Math.max(pageIndex, 0), plans.length - 1);
  const plan = plans[safeIndex];
  const totalPages = plans.length;
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === totalPages - 1;
  const isCurrentPlan = plan.id === currentPlanId;

  const goTo = (index: number) => {
    if (index < 0 || index >= totalPages) {
      return;
    }
    setFeaturesExpanded(true);
    setPageIndex(index);
  };

  const goPrevious = () => goTo(safeIndex - 1);
  const goNext = () => goTo(safeIndex + 1);

  return (
    <div className={`plan-pager plan-pager--theme-${plan.id}`}>
      <header className="plan-pager__head">
        <div className="plan-pager__status" aria-live="polite">
          <span className="plan-pager__count">
            Plan {safeIndex + 1} de {totalPages}
          </span>
          <h3 className="plan-pager__name">{plan.name}</h3>
        </div>
        <div aria-label="Progreso de planes" className="plan-pager__progress" role="progressbar" aria-valuemax={totalPages} aria-valuemin={1} aria-valuenow={safeIndex + 1}>
          {plans.map((item, index) => (
            <span aria-hidden="true" className={`plan-pager__segment ${index === safeIndex ? "plan-pager__segment--active" : ""}`.trim()} key={item.id} />
          ))}
        </div>
      </header>

      <div className="plan-pager__card" key={plan.id}>
        <PlanCard
          featuresExpanded={featuresExpanded}
          isCurrentPlan={isCurrentPlan}
          loading={upgradeLoadingPlanId === plan.id}
          onToggleFeatures={() => setFeaturesExpanded((current) => !current)}
          onUpgrade={onUpgrade}
          plan={plan}
        />
      </div>

      <div className="plan-pager__nav">
        <button
          aria-disabled={isFirst}
          className="plan-pager__btn"
          disabled={isFirst}
          onClick={goPrevious}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={18} />
          Plan anterior
        </button>

        <div className="plan-pager__indicators" role="group" aria-label="Seleccionar plan">
          {plans.map((item, index) => (
            <button
              aria-current={index === safeIndex ? "page" : undefined}
              aria-label={`Ver plan ${planNames[item.id]}`}
              className={`plan-pager__indicator ${index === safeIndex ? "plan-pager__indicator--active" : ""}`.trim()}
              key={item.id}
              onClick={() => goTo(index)}
              type="button"
            >
              <span className="plan-pager__indicator-dot" aria-hidden="true" />
            </button>
          ))}
        </div>

        <button
          aria-disabled={isLast}
          className="plan-pager__btn"
          disabled={isLast}
          onClick={goNext}
          type="button"
        >
          Siguiente plan
          <ChevronRight aria-hidden="true" size={18} />
        </button>
      </div>

      <PlanQuickComparison currentPlanId={currentPlanId} plans={plans} />
    </div>
  );
}